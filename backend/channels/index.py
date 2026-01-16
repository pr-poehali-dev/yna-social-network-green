import json
import os
import psycopg2
import base64
import boto3
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для работы с каналами - создание, подписка, получение постов канала'''
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
            query_params = event.get('queryStringParameters') or {}
            channel_id = query_params.get('channel_id')
            
            if channel_id:
                cur.execute(f'''
                    SELECT c.id, c.name, c.description, c.avatar_url, c.subscribers_count, c.is_private, c.created_at,
                           u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.verification_color
                    FROM {schema}.channels c
                    JOIN {schema}.users u ON c.owner_id = u.id
                    WHERE c.id = %s
                ''', (channel_id,))
                channel = cur.fetchone()
                
                if not channel:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Канал не найден'}),
                        'isBase64Encoded': False
                    }
                
                result = {
                    'id': channel[0],
                    'name': channel[1],
                    'description': channel[2],
                    'avatar_url': channel[3],
                    'subscribers_count': channel[4],
                    'is_private': channel[5],
                    'created_at': channel[6].isoformat() if channel[6] else None,
                    'owner': {
                        'id': channel[7],
                        'username': channel[8],
                        'display_name': channel[9],
                        'avatar_url': channel[10],
                        'is_verified': channel[11],
                        'verification_color': channel[12]
                    }
                }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'channel': result}),
                    'isBase64Encoded': False
                }
            else:
                cur.execute(f'''
                    SELECT c.id, c.name, c.description, c.avatar_url, c.subscribers_count, c.is_private, c.created_at,
                           u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.verification_color
                    FROM {schema}.channels c
                    JOIN {schema}.users u ON c.owner_id = u.id
                    WHERE c.is_private = FALSE
                    ORDER BY c.subscribers_count DESC
                    LIMIT 50
                ''')
                channels = cur.fetchall()
                
                result = []
                for ch in channels:
                    result.append({
                        'id': ch[0],
                        'name': ch[1],
                        'description': ch[2],
                        'avatar_url': ch[3],
                        'subscribers_count': ch[4],
                        'is_private': ch[5],
                        'created_at': ch[6].isoformat() if ch[6] else None,
                        'owner': {
                            'id': ch[7],
                            'username': ch[8],
                            'display_name': ch[9],
                            'avatar_url': ch[10],
                            'is_verified': ch[11],
                            'verification_color': ch[12]
                        }
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'channels': result}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create':
                user_id = body.get('user_id')
                name = body.get('name', '').strip()
                description = body.get('description', '').strip()
                is_private = body.get('is_private', False)
                avatar_data = body.get('avatar_data')
                
                if not user_id or not name:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id и name'}),
                        'isBase64Encoded': False
                    }
                
                avatar_url = None
                if avatar_data:
                    try:
                        s3 = boto3.client('s3',
                            endpoint_url='https://bucket.poehali.dev',
                            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                        )
                        
                        file_key = f'channels/{user_id}_{datetime.now().timestamp()}.jpg'
                        file_data = base64.b64decode(avatar_data)
                        
                        s3.put_object(
                            Bucket='files',
                            Key=file_key,
                            Body=file_data,
                            ContentType='image/jpeg'
                        )
                        
                        avatar_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"
                    except Exception as e:
                        print(f"Error uploading avatar: {e}")
                
                cur.execute(f'''
                    INSERT INTO {schema}.channels (name, description, owner_id, avatar_url, is_private) 
                    VALUES (%s, %s, %s, %s, %s) RETURNING id
                ''', (name, description, user_id, avatar_url, is_private))
                channel_id = cur.fetchone()[0]
                
                cur.execute(f'''
                    INSERT INTO {schema}.channel_subscriptions (channel_id, user_id) VALUES (%s, %s)
                ''', (channel_id, user_id))
                
                cur.execute(f'''
                    UPDATE {schema}.channels SET subscribers_count = 1 WHERE id = %s
                ''', (channel_id,))
                
                cur.execute(f'''
                    UPDATE {schema}.users SET yn_balance = yn_balance + 50 WHERE id = %s RETURNING yn_balance
                ''', (user_id,))
                new_balance = cur.fetchone()[0]
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'channel_id': channel_id,
                        'new_balance': new_balance
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'subscribe':
                user_id = body.get('user_id')
                channel_id = body.get('channel_id')
                
                if not all([user_id, channel_id]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id и channel_id'}),
                        'isBase64Encoded': False
                    }
                
                try:
                    cur.execute(f'''
                        INSERT INTO {schema}.channel_subscriptions (channel_id, user_id) VALUES (%s, %s)
                    ''', (channel_id, user_id))
                    cur.execute(f'''
                        UPDATE {schema}.channels SET subscribers_count = subscribers_count + 1 WHERE id = %s
                    ''', (channel_id,))
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'subscribed': True}),
                        'isBase64Encoded': False
                    }
                except psycopg2.IntegrityError:
                    conn.rollback()
                    cur.execute(f'''
                        DELETE FROM {schema}.channel_subscriptions WHERE channel_id = %s AND user_id = %s
                    ''', (channel_id, user_id))
                    cur.execute(f'''
                        UPDATE {schema}.channels SET subscribers_count = subscribers_count - 1 WHERE id = %s
                    ''', (channel_id,))
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'subscribed': False}),
                        'isBase64Encoded': False
                    }
            
            elif action == 'get_posts':
                channel_id = body.get('channel_id')
                
                if not channel_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется channel_id'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(f'''
                    SELECT p.id, p.content, p.media_url, p.media_type, p.likes_count, p.comments_count, p.created_at,
                           u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.verification_color
                    FROM {schema}.posts p
                    JOIN {schema}.users u ON p.user_id = u.id
                    WHERE p.channel_id = %s
                    ORDER BY p.created_at DESC
                    LIMIT 50
                ''', (channel_id,))
                posts = cur.fetchall()
                
                result = []
                for p in posts:
                    result.append({
                        'id': p[0],
                        'content': p[1],
                        'media_url': p[2],
                        'media_type': p[3],
                        'likes_count': p[4],
                        'comments_count': p[5],
                        'created_at': p[6].isoformat() if p[6] else None,
                        'author': {
                            'id': p[7],
                            'username': p[8],
                            'display_name': p[9],
                            'avatar_url': p[10],
                            'is_verified': p[11],
                            'verification_color': p[12]
                        }
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'posts': result}),
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
