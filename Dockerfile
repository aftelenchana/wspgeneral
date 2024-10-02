# Usamos la imagen base de Node.js
FROM node:18-bullseye as bot

# Establecemos el directorio de trabajo en /app
WORKDIR /app

# Copiamos los archivos package.json y package-lock.json
COPY package*.json ./

# Instalamos TODAS las dependencias (incluidas las de desarrollo)
RUN npm install

# Copiamos el resto de los archivos de la aplicación
COPY . .

# Aseguramos que los permisos estén configurados correctamente
RUN chmod -R 755 /app

# Variables de entorno (puedes agregar más si es necesario)
ARG RAILWAY_STATIC_URL
ARG PUBLIC_URL
ARG PORT

# Ejecuta ESLint y luego inicia la aplicación
CMD ["npm", "run", "start"]
