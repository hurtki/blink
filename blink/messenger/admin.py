from django.contrib import admin
from .models import Chat, ChatMember, Message
# Register your models here.

admin.site.register(Chat)
admin.site.register(ChatMember)
admin.site.register(Message)