import os
import sqlite3
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackQueryHandler, ContextTypes
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

# -------------------------------
# KONFIGURATSIYA
# -------------------------------
TOKEN = os.getenv("BOT_TOKEN", "8136107951:AAHkOoEp4chVJXnGVkPhk3hwbWo5l0FMfqE")
ADMIN_ID = int(os.getenv("ADMIN_ID", "6067477588"))
MINI_APP_BASE_URL = "https://gorgeous-heliotrope-3a8633.netlify.app/#profile"  # O'ZGARTIRING!

# -------------------------------
# DATABASE
# -------------------------------
conn = sqlite3.connect('soat2000.db', check_same_thread=False)
cursor = conn.cursor()

# ... (oldingi database kodlari o'zgarishsiz) ...

# -------------------------------
# MINI APP URL YARATISH
# -------------------------------
def create_mini_app_url(user_id, user_data=None):
    """Mini App URL yaratish user ma'lumotlari bilan"""
    if not user_data:
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        user_data = cursor.fetchone()
    
    if not user_data:
        return MINI_APP_BASE_URL
    
    # Ma'lumotlarni encode qilish
    params = {
        'user_id': str(user_id),
        'name': urllib.parse.quote(user_data[2] if user_data[2] else ''),
        'phone': user_data[1] if user_data[1] else '',
        'hours': str(user_data[3]) if user_data[3] else '2',
        'goal': urllib.parse.quote(user_data[4] if user_data[4] else 'kasbiy'),
        'premium': '1' if user_data[6] == 1 else '0',
        'trial_days': str(user_data[5]) if user_data[5] else '3',
        'total_minutes': str(user_data[8]) if user_data[8] else '0',
        'streak_days': str(user_data[9]) if user_data[9] else '0'
    }
    
    # URL yaratish
    query_string = '&'.join([f"{k}={v}" for k, v in params.items() if v])
    return f"{MINI_APP_BASE_URL}/index.html?{query_string}"

# -------------------------------
# BOT HANDLERLARI YANGILANMASI
# -------------------------------
async def show_main_menu(update, context, user_id):
    user = get_user_state(user_id)
    if not user:
        await start(update, context)
        return
    
    # Trial/premium holatini tekshirish
    trial_days = user[5]
    
    if trial_days <= 0 and user[6] == 0:
        await show_premium_required(update, context, user_id)
        return
    
    # Mini App URL yaratish
    mini_app_url = create_mini_app_url(user_id, user)
    
    keyboard = [
        [InlineKeyboardButton(
            "📱 Mini App'ni ochish", 
            web_app=WebAppInfo(url=mini_app_url)
        )],
        [InlineKeyboardButton("💎 Premium ma'lumot", callback_data='premium_info')],
        [InlineKeyboardButton("🆘 Qo'llab-quvvatlash", callback_data='support')]
    ]
    
    message = f"👤 *Profil ma'lumotlari*\n\n"
    message += f"👤 Ism: {user[2]}\n"
    message += f"⏰ Kunlik: {user[3]} soat\n"
    message += f"🎯 Maqsad: {user[4]}\n"
    message += f"⏳ Progress: {user[8] // 60} soat / 2000 soat\n"
    
    if user[6] == 1:
        message += f"💎 Status: *Premium aktiv*\n"
    else:
        message += f"🎁 Trial: *{trial_days} kun qoldi*\n"
    
    message += f"\n*Mini App'da davom eting:*"
    
    await context.bot.send_message(
        chat_id=user_id,
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )

async def show_premium_required(update, context, user_id):
    user = get_user_state(user_id)
    card_number = get_setting('card_number')
    masked_card = f"{card_number[:4]} **** **** {card_number[-4:]}"
    price = get_setting('price')
    
    # Payment sahifasi uchun URL
    payment_url = f"{MINI_APP_BASE_URL}/payment.html?user_id={user_id}"
    
    keyboard = [
        [InlineKeyboardButton("💳 To'lov qilish", web_app=WebAppInfo(url=payment_url))],
        [InlineKeyboardButton("🆘 Yordam kerak", callback_data='support')],
        [InlineKeyboardButton("📱 Mini App", web_app=WebAppInfo(url=create_mini_app_url(user_id, user)))]
    ]
    
    message = (
        "❌ *Profil muzlatildi!*\n\n"
        "3 kunlik trial tugadi. Davom etish uchun premium sotib olishingiz kerak.\n\n"
        f"💎 Premium narxi: *{price} so'm*\n"
        f"💳 To'lov kartasi: `{masked_card}`\n\n"
        "*To'lov jarayoni:*\n"
        "1. To'lov tugmasini bosing\n"
        "2. Karta raqamiga to'lov qiling\n"
        "3. Chekni screenshot qilib botga yuboring\n"
        "4. Admin tasdiqlagach, premium aktiv bo'ladi"
    )
    
    await context.bot.send_message(
        chat_id=user_id,
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )

# ... (qolgan kodlar o'zgarishsiz) ...