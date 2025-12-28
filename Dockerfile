
FROM nginx:1.17.6
RUN rm -rf /usr/share/nginx/html/*
RUN echo $(ls -1 /)
COPY /dist/* /usr/share/nginx/html/
COPY default.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]