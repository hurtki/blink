from rest_framework import serializers
from django.contrib.auth.models import User

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
    