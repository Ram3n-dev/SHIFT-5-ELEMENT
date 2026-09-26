# Сборка
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Сначала только проект — так Docker кэширует восстановление пакетов
COPY LimitPlus.Api/LimitPlus.Api.csproj LimitPlus.Api/
RUN dotnet restore LimitPlus.Api/LimitPlus.Api.csproj

COPY LimitPlus.Api/ LimitPlus.Api/
RUN dotnet publish LimitPlus.Api/LimitPlus.Api.csproj -c Release -o /app/publish --no-restore

# Запуск
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

# Папка для ключей шифрования cookie входа (в docker-compose к ней подключается том)
RUN mkdir -p /keys && chown $APP_UID /keys

# Образы .NET по умолчанию слушают порт 8080 и умеют работать без root
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "LimitPlus.Api.dll"]
