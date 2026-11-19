FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html
COPY css/        /usr/share/nginx/html/css/
COPY function/   /usr/share/nginx/html/function/
COPY images/     /usr/share/nginx/html/images/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]