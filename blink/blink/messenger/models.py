from django.db import models


# модель чата 
class Chat(models.Model):

    # является ли чат группой 
    isGroup = models.BooleanField(blank=False)

    # имя 
    name = models.CharField(max_length=50, null=True, blank=True)
    
    # поле для свзяи с моделью пользователя, свзять осуществляется через модель ChatMember 
    members = models.ManyToManyField("auth.User", through="ChatMember", related_name="chats")

    # когда была создана
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name}'

# связная модель чата с пользователем 
class ChatMember(models.Model):
    # юзер 
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    # чат в котором юзер
    chat = models.ForeignKey("Chat", on_delete=models.CASCADE)
    # дата создании свзязи
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"member: {self.user} of chat:{self.chat}"
# модель сообщения 
class Message(models.Model):
    # чат в котором отослано 
    chat = models.ForeignKey("Chat", on_delete=models.CASCADE)
    # кем отослано 
    sender = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    # текст 
    text = models.TextField()
    # дата отправки 
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}'s message"