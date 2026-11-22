FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html
COPY css/        /usr/share/nginx/html/css/
COPY function/   /usr/share/nginx/html/function/
COPY images/     /usr/share/nginx/html/images/

# [API] Cấu hình nginx: phục vụ giao diện + chuyển tiếp /api/ sang server Python
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]