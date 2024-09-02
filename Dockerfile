FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN ls -la
COPY /dist .
CMD ["nginx", "-g", "daemon off;"]