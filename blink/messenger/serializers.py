from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Chat, Message

# сериализатор данных прищедших на апи регистрации в объект в базе данных 
class RegisterSerializer(serializers.ModelSerializer):
    # добавляем поле для подтверждения пароля которе тоже приходит 
    password2 = serializers.CharField(write_only=True)
    # говорим какие данные будут ему данны для перевода в объект 
    class Meta:
        # указываем модель которую хотим получить на выходе 
        model = User
        fields = ['username', 'email', 'password', 'password2']
    # валидация равенства паролей которые отправили на апи 
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    

    # метод для записи в базу данных объекта после сериализации 
    def create(self, validated_data):
        # убираем поле подтверждения пароля тк его в базе данных нету 
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class ChatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = ['name', 'isGroup', 'id']



class UserSerializer(serializers.ModelSerializer):
    # сериализатор данных пользователя 
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class MessageSerializer(serializers.ModelSerializer):
    # сериалиатор данных сообщения 
    sender = UserSerializer(read_only=True)  # Вложенный сериализатор пользователя

    class Meta:
        model = Message
        fields = ["id", "sender", "text", "sent_at"]


class ChatSerializer(serializers.ModelSerializer):
    # сериализатор чата с участниками 
    # сначала сериализируем всех участников отедельно
    members = UserSerializer(many=True, read_only=True)
    # создаем поле последнего сообщения для превьюшки чата 
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ["id", "name", "isGroup", "members", "created_at", "last_message"]

    def get_last_message(self, obj):
        # получаем послежнее сообщение в чате 
        last_msg = obj.message_set.order_by("-sent_at").first()
        return MessageSerializer(last_msg).data if last_msg else None

