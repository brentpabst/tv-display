FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .
CMD ["nginx", "-g", "daemon off;"]