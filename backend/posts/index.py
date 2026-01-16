import json
import os
import psycopg2
import base64
import boto3
from datetime import datetime, timedelta

def handler(event: dict, context) -> dict:
    '''API для работы с постами, комментариями и историями'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
        
        if method == 'GET':
            cur.execute(f'''
                SELECT p.id, p.content, p.media_url, p.media_type, p.channel_id, 
                       p.likes_count, p.comments_count, p.created_at, p.is_boosted,
                       u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.verification_color, u.is_premium
                FROM {schema}.posts p
                JOIN {schema}.users u ON p.user_id = u.id
                ORDER BY p.is_boosted DESC, p.created_at DESC
                LIMIT 50
            ''')
            posts = cur.fetchall()
            
            result = []
            for post in posts:
                result.append({
                    'id': post[0],
                    'content': post[1],
                    'media_url': post[2],
                    'media_type': post[3],
                    'channel_id': post[4],
                    'likes_count': post[5],
                    'comments_count': post[6],
                    'created_at': post[7].isoformat() if post[7] else None,
                    'is_boosted': post[8],
                    'author': {
                        'id': post[9],
                        'username': post[10],
                        'display_name': post[11],
                        'avatar_url': post[12],
                        'is_verified': post[13],
                        'verification_color': post[14],
                        'is_premium': post[15]
                    }
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'posts': result}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create':
                user_id = body.get('user_id')
                content = body.get('content', '').strip()
                channel_id = body.get('channel_id')
                media_data = body.get('media_data')
                media_type = body.get('media_type')
                
                if not user_id or not content:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id и content'}),
                        'isBase64Encoded': False
                    }
                
                media_url = None
                
                if media_data and media_type:
                    try:
                        s3 = boto3.client('s3',
                            endpoint_url='https://bucket.poehali.dev',
                            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                        )
                        
                        file_ext = 'jpg' if media_type.startswith('image') else 'mp4'
                        file_key = f'posts/{user_id}_{datetime.now().timestamp()}.{file_ext}'
                        
                        file_data = base64.b64decode(media_data)
                        
                        s3.put_object(
                            Bucket='files',
                            Key=file_key,
                            Body=file_data,
                            ContentType=media_type
                        )
                        
                        media_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"
                    except Exception as e:
                        print(f"Error uploading media: {e}")
                
                cur.execute(f'''
                    SELECT boost_active_until FROM {schema}.users WHERE id = %s
                ''', (user_id,))
                user_data = cur.fetchone()
                is_boosted = False
                if user_data and user_data[0]:
                    is_boosted = datetime.now() < user_data[0]
                
                cur.execute(f'''
                    INSERT INTO {schema}.posts (user_id, content, media_url, media_type, channel_id, is_boosted) 
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                ''', (user_id, content, media_url, media_type, channel_id, is_boosted))
                post_id = cur.fetchone()[0]
                
                cur.execute(f'''
                    UPDATE {schema}.users SET yn_balance = yn_balance + 20 WHERE id = %s RETURNING yn_balance
                ''', (user_id,))
                new_balance = cur.fetchone()[0]
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'post_id': post_id,
                        'new_balance': new_balance
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'like':
                user_id = body.get('user_id')
                post_id = body.get('post_id')
                use_super_like = body.get('use_super_like', False)
                
                if not user_id or not post_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id и post_id'}),
                        'isBase64Encoded': False
                    }
                
                if use_super_like:
                    cur.execute(f'SELECT super_likes_count FROM {schema}.users WHERE id = %s', (user_id,))
                    super_likes = cur.fetchone()[0] or 0
                    if super_likes <= 0:
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Нет супер-лайков'}),
                            'isBase64Encoded': False
                        }
                
                try:
                    cur.execute(f'''
                        INSERT INTO {schema}.likes (user_id, post_id, is_super_like) VALUES (%s, %s, %s)
                    ''', (user_id, post_id, use_super_like))
                    
                    like_value = 3 if use_super_like else 1
                    cur.execute(f'''
                        UPDATE {schema}.posts SET likes_count = likes_count + %s WHERE id = %s
                    ''', (like_value, post_id))
                    
                    if use_super_like:
                        cur.execute(f'''
                            UPDATE {schema}.users SET super_likes_count = super_likes_count - 1 WHERE id = %s
                        ''', (user_id,))
                    
                    cur.execute(f'''
                        UPDATE {schema}.users SET yn_balance = yn_balance + 5 WHERE id = %s RETURNING yn_balance
                    ''', (user_id,))
                    new_balance = cur.fetchone()[0]
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'success': True,
                            'liked': True,
                            'is_super_like': use_super_like,
                            'new_balance': new_balance
                        }),
                        'isBase64Encoded': False
                    }
                except psycopg2.IntegrityError:
                    conn.rollback()
                    cur.execute(f'''
                        SELECT is_super_like FROM {schema}.likes WHERE user_id = %s AND post_id = %s
                    ''', (user_id, post_id))
                    was_super = cur.fetchone()[0]
                    like_value = 3 if was_super else 1
                    
                    cur.execute(f'''
                        DELETE FROM {schema}.likes WHERE user_id = %s AND post_id = %s
                    ''', (user_id, post_id))
                    cur.execute(f'''
                        UPDATE {schema}.posts SET likes_count = likes_count - %s WHERE id = %s
                    ''', (like_value, post_id))
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'liked': False}),
                        'isBase64Encoded': False
                    }
            
            elif action == 'comment':
                user_id = body.get('user_id')
                post_id = body.get('post_id')
                content = body.get('content', '').strip()
                
                if not all([user_id, post_id, content]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id, post_id и content'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(f'''
                    INSERT INTO {schema}.comments (post_id, user_id, content) 
                    VALUES (%s, %s, %s) RETURNING id
                ''', (post_id, user_id, content))
                comment_id = cur.fetchone()[0]
                
                cur.execute(f'''
                    UPDATE {schema}.posts SET comments_count = comments_count + 1 WHERE id = %s
                ''', (post_id,))
                
                cur.execute(f'''
                    UPDATE {schema}.users SET yn_balance = yn_balance + 10 WHERE id = %s RETURNING yn_balance
                ''', (user_id,))
                new_balance = cur.fetchone()[0]
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'comment_id': comment_id,
                        'new_balance': new_balance
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'get_comments':
                post_id = body.get('post_id')
                
                if not post_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется post_id'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(f'''
                    SELECT c.id, c.content, c.likes_count, c.created_at,
                           u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.verification_color
                    FROM {schema}.comments c
                    JOIN {schema}.users u ON c.user_id = u.id
                    WHERE c.post_id = %s
                    ORDER BY c.created_at ASC
                ''', (post_id,))
                comments = cur.fetchall()
                
                result = []
                for c in comments:
                    result.append({
                        'id': c[0],
                        'content': c[1],
                        'likes_count': c[2],
                        'created_at': c[3].isoformat() if c[3] else None,
                        'author': {
                            'id': c[4],
                            'username': c[5],
                            'display_name': c[6],
                            'avatar_url': c[7],
                            'is_verified': c[8],
                            'verification_color': c[9]
                        }
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'comments': result}),
                    'isBase64Encoded': False
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid action'}),
                    'isBase64Encoded': False
                }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()
