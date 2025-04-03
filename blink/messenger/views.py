from django.shortcuts import render
from rest_framework import generics
# импортируем сприализаторы
from .serializers import RegisterSerializer, ChatsSerializer, ChatSerializer
# импортируем модель пользователя 
from django.contrib.auth.models import User
# импортируем базовую модель для rest api
from rest_framework.views import APIView
# импортируем метод для проверки аутентификации
from rest_framework.permissions import IsAuthenticated
# испортируем класс для возврата данных json клиенту 
from rest_framework.response import Response
# импортируем класс связи чата и юзера
from .models import ChatMember, Chat
# полезная штука для получения объектов
from django.shortcuts import get_object_or_404

# страница входа
def login_page(request):
    return render(request, 'messenger/html/login.html')
# страница регистрации 
def register_page(request):
    return render(request, 'messenger/html/register.html')
# страница чата 
def chat_page(request):
    return render(request, 'messenger/html/chat.html')

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

class ChatsAPI(APIView):
    permission_classes = [IsAuthenticated]
    # получение списока чатов пользователя 
    def get(self, request):
        user = request.user
        chats = user.chats.all()
        serializer = ChatsSerializer(chats, many=True)
        return Response(serializer.data)
    # создание нового чата еще не сделано 
    def post(self, request):
        pass

class ChatAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, chat_id):
        user = request.user
        
        # Проверяем, есть ли связь между пользователем и чатом
        is_member = ChatMember.objects.filter(user=user, chat_id=chat_id).exists()
        if not is_member:
            return Response({"error": "Вы не состоите в этом чате"}, status=403)

        # Получаем сам чат
        chat = get_object_or_404(Chat, id=chat_id)

        # Сериализуем данные
        serialized_chat = ChatSerializer(chat)
        return Response(serialized_chat.data)  
