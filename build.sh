#!/bin/bash

# Script de build para Render
# Se ejecuta en la raíz del proyecto

echo "==> Building Barbados Backend"
cd backend
npm install
cd ..

echo "==> Building Barbados Frontend"
npm install
npm run build

echo "==> Build complete!"
