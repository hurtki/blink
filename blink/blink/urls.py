from django.contrib import admin
from django.urls import path, include
# импорты представлений для jwt авторизации из библиотеки 
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
# импорты для передачи статических файлов
from django.conf import settings
from django.conf.urls.static import static
# импорты представления для регистрации 
from messenger.views import RegisterView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name="registration_api"),
    path('messenger/', include('messenger.urls'))
]+static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
# добавляем путь для статических файлов 