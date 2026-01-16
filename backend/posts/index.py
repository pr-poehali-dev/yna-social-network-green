import json
import os
import psycopg2
import base64
import boto3
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для работы с постами - создание, получение, лайки'''
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
                SELECT p.id, p.content, p.media_url, p.media_type, p.channel, 
                       p.likes_count, p.comments_count, p.created_at,
                       u.id, u.username, u.display_name, u.avatar_url, u.is_verified
                FROM {schema}.posts p
                JOIN {schema}.users u ON p.user_id = u.id
                ORDER BY p.created_at DESC
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
                    'channel': post[4],
                    'likes_count': post[5],
                    'comments_count': post[6],
                    'created_at': post[7].isoformat() if post[7] else None,
                    'author': {
                        'id': post[8],
                        'username': post[9],
                        'display_name': post[10],
                        'avatar_url': post[11],
                        'is_verified': post[12]
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
                channel = body.get('channel')
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
                
                cur.execute(
                    f'INSERT INTO {schema}.posts (user_id, content, media_url, media_type, channel) VALUES (%s, %s, %s, %s, %s) RETURNING id',
                    (user_id, content, media_url, media_type, channel)
                )
                post_id = cur.fetchone()[0]
                
                cur.execute(
                    f'UPDATE {schema}.users SET yn_balance = yn_balance + 20 WHERE id = %s RETURNING yn_balance',
                    (user_id,)
                )
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
                
                if not user_id or not post_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id и post_id'}),
                        'isBase64Encoded': False
                    }
                
                try:
                    cur.execute(
                        f'INSERT INTO {schema}.likes (user_id, post_id) VALUES (%s, %s)',
                        (user_id, post_id)
                    )
                    cur.execute(
                        f'UPDATE {schema}.posts SET likes_count = likes_count + 1 WHERE id = %s',
                        (post_id,)
                    )
                    cur.execute(
                        f'UPDATE {schema}.users SET yn_balance = yn_balance + 5 WHERE id = %s RETURNING yn_balance',
                        (user_id,)
                    )
                    new_balance = cur.fetchone()[0]
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'success': True,
                            'liked': True,
                            'new_balance': new_balance
                        }),
                        'isBase64Encoded': False
                    }
                except psycopg2.IntegrityError:
                    conn.rollback()
                    cur.execute(
                        f'DELETE FROM {schema}.likes WHERE user_id = %s AND post_id = %s',
                        (user_id, post_id)
                    )
                    cur.execute(
                        f'UPDATE {schema}.posts SET likes_count = likes_count - 1 WHERE id = %s',
                        (post_id,)
                    )
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'liked': False}),
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