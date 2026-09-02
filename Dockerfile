# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["src/LedgerAndField.Api/LedgerAndField.Api.csproj", "src/LedgerAndField.Api/"]
RUN dotnet restore "src/LedgerAndField.Api/LedgerAndField.Api.csproj"
COPY . .
WORKDIR "/src/src/LedgerAndField.Api"
RUN dotnet publish "LedgerAndField.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_USE_POLLING_FILE_WATCHER=1
ENV DOTNET_RUNNING_IN_CONTAINER=true
EXPOSE 8080
ENTRYPOINT ["dotnet", "LedgerAndField.Api.dll"]
