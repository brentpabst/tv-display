FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN ls -la
#COPY /dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]