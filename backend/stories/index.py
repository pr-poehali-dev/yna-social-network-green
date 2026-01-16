import json
import os
import psycopg2
import base64
import boto3
from datetime import datetime, timedelta

def handler(event: dict, context) -> dict:
    '''API для работы с историями - создание, просмотр, получение'''
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
                DELETE FROM {schema}.stories WHERE expires_at < NOW()
            ''')
            conn.commit()
            
            cur.execute(f'''
                SELECT s.id, s.media_url, s.media_type, s.views_count, s.created_at, s.expires_at,
                       u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.verification_color
                FROM {schema}.stories s
                JOIN {schema}.users u ON s.user_id = u.id
                WHERE s.expires_at > NOW()
                ORDER BY s.created_at DESC
            ''')
            stories = cur.fetchall()
            
            user_stories = {}
            for story in stories:
                user_id = story[6]
                if user_id not in user_stories:
                    user_stories[user_id] = {
                        'user': {
                            'id': story[6],
                            'username': story[7],
                            'display_name': story[8],
                            'avatar_url': story[9],
                            'is_verified': story[10],
                            'verification_color': story[11]
                        },
                        'stories': []
                    }
                
                user_stories[user_id]['stories'].append({
                    'id': story[0],
                    'media_url': story[1],
                    'media_type': story[2],
                    'views_count': story[3],
                    'created_at': story[4].isoformat() if story[4] else None,
                    'expires_at': story[5].isoformat() if story[5] else None
                })
            
            result = list(user_stories.values())
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'stories': result}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create':
                user_id = body.get('user_id')
                media_data = body.get('media_data')
                media_type = body.get('media_type')
                
                if not all([user_id, media_data, media_type]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id, media_data и media_type'}),
                        'isBase64Encoded': False
                    }
                
                try:
                    s3 = boto3.client('s3',
                        endpoint_url='https://bucket.poehali.dev',
                        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                    )
                    
                    file_ext = 'jpg' if media_type.startswith('image') else 'mp4'
                    file_key = f'stories/{user_id}_{datetime.now().timestamp()}.{file_ext}'
                    
                    file_data = base64.b64decode(media_data)
                    
                    s3.put_object(
                        Bucket='files',
                        Key=file_key,
                        Body=file_data,
                        ContentType=media_type
                    )
                    
                    media_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"
                except Exception as e:
                    return {
                        'statusCode': 500,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': f'Ошибка загрузки медиа: {str(e)}'}),
                        'isBase64Encoded': False
                    }
                
                expires_at = datetime.now() + timedelta(hours=24)
                
                cur.execute(f'''
                    INSERT INTO {schema}.stories (user_id, media_url, media_type, expires_at) 
                    VALUES (%s, %s, %s, %s) RETURNING id
                ''', (user_id, media_url, media_type, expires_at))
                story_id = cur.fetchone()[0]
                
                cur.execute(f'''
                    UPDATE {schema}.users SET yn_balance = yn_balance + 15 WHERE id = %s RETURNING yn_balance
                ''', (user_id,))
                new_balance = cur.fetchone()[0]
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'story_id': story_id,
                        'new_balance': new_balance
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'view':
                user_id = body.get('user_id')
                story_id = body.get('story_id')
                
                if not all([user_id, story_id]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Требуется user_id и story_id'}),
                        'isBase64Encoded': False
                    }
                
                try:
                    cur.execute(f'''
                        INSERT INTO {schema}.story_views (story_id, user_id) VALUES (%s, %s)
                    ''', (story_id, user_id))
                    cur.execute(f'''
                        UPDATE {schema}.stories SET views_count = views_count + 1 WHERE id = %s
                    ''', (story_id,))
                    conn.commit()
                except psycopg2.IntegrityError:
                    conn.rollback()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
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
