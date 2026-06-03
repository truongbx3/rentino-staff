FROM nginx:1.25-alpine

# Clean up default nginx assets
RUN rm -rf /usr/share/nginx/html/*

# Copy local production build artifacts to Nginx html directory
COPY dist/angular-d3js/ /usr/share/nginx/html/

# Copy default nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]