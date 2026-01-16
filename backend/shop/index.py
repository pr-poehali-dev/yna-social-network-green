import json
import os
import psycopg2
from datetime import datetime, timedelta

def handler(event: dict, context) -> dict:
    '''API для покупок в магазине с премиум функциями'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        item_type = body.get('item_type')
        item_name = body.get('item_name')
        price = body.get('price')
        
        if not user_id or not item_type or not item_name or not price:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required fields'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
        
        cur.execute(f'SELECT yn_balance FROM {schema}.users WHERE id = %s', (user_id,))
        result = cur.fetchone()
        
        if not result:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User not found'}),
                'isBase64Encoded': False
            }
        
        current_balance = result[0]
        
        if current_balance < price:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Недостаточно юнакоинов'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            f'UPDATE {schema}.users SET yn_balance = yn_balance - %s WHERE id = %s RETURNING yn_balance',
            (price, user_id)
        )
        new_balance = cur.fetchone()[0]
        
        cur.execute(
            f'INSERT INTO {schema}.purchases (user_id, item_type, item_name, price) VALUES (%s, %s, %s, %s)',
            (user_id, item_type, item_name, price)
        )
        
        message = f'{item_name} успешно приобретен!'
        
        if item_type == 'premium_account':
            cur.execute(f'''
                UPDATE {schema}.users 
                SET is_premium = TRUE, 
                    verification_color = 'blue',
                    is_verified = TRUE 
                WHERE id = %s
            ''', (user_id,))
            message = 'Премиум аккаунт активирован! Получена синяя галочка и доступ ко всем темам радуги!'
        
        elif item_type == 'verification':
            cur.execute(f'''
                UPDATE {schema}.users 
                SET is_verified = TRUE, 
                    verification_color = 'red' 
                WHERE id = %s
            ''', (user_id,))
            message = 'Верификация получена! Красная галочка установлена!'
        
        elif item_type == 'boost':
            boost_until = datetime.now() + timedelta(hours=24)
            cur.execute(f'''
                UPDATE {schema}.users 
                SET boost_active_until = %s 
                WHERE id = %s
            ''', (boost_until, user_id))
            message = 'Бустер активирован! Ваши посты будут в топе 24 часа!'
        
        elif item_type == 'custom_theme':
            cur.execute(f'''
                UPDATE {schema}.users 
                SET custom_theme = 'red-dark' 
                WHERE id = %s
            ''', (user_id,))
            message = 'Красно-темная тема установлена в профиль!'
        
        elif item_type == 'super_likes':
            cur.execute(f'''
                UPDATE {schema}.users 
                SET super_likes_count = super_likes_count + 50 
                WHERE id = %s
            ''', (user_id,))
            message = '50 супер-лайков добавлено! Каждый супер-лайк считается за 3 обычных!'
        
        elif item_type == 'premium_emoji':
            cur.execute(f'''
                UPDATE {schema}.users 
                SET premium_emoji_enabled = TRUE 
                WHERE id = %s
            ''', (user_id,))
            message = 'Премиум эмодзи разблокированы! Теперь вы можете добавлять эмодзи в посты!'
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'new_balance': new_balance,
                'message': message
            }),
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
