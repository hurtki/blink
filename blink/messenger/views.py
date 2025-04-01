from django.shortcuts import render

# страница входа
def login_page(request):
    return render('messenger/html/login.html')
# страница регистрации 
def register_page(request):
    return render('messenger/html/register.html')
# страница чата 
def chat_page(request):
    return render('messenger/html/chat.html')
