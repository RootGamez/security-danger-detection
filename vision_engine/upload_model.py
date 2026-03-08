from roboflow import Roboflow
import os

# 1. Configuración de acceso
# Saca tu API KEY de: https://app.roboflow.com/settings/workspace
rf = Roboflow(api_key="oG18ZkUanMcy9gd1fwMS") 

# El ID de tu proyecto según tu URL de Roboflow
project = rf.workspace("gamez-utnep").project("personas-w1mgu")

# 2. RUTA CORREGIDA PARA WSL (Accediendo al disco C de Windows)
# En WSL, tus descargas de Windows están en /mnt/c/Users/USUARIO/Downloads
nombre_archivo = "modelo_v4_9k_2026-02-28_16h27.pt"
ruta_modelo = f"/mnt/c/Users/LENOVO/Downloads/{nombre_archivo}"

# 3. Subida (Deploy)
# Si la versión 4 ya existe y tiene imágenes, esto subirá los pesos ahí.
version_numero = 4 

if os.path.exists(ruta_modelo):
    print(f"📦 Archivo detectado en: {ruta_modelo}")
    print(f"🚀 Iniciando subida de {nombre_archivo} a Roboflow (Versión {version_numero})...")
    
    project.version(version_numero).deploy(
        model_type="yolov8", 
        model_path=ruta_modelo
    )
    
    print(f"✅ ¡ÉXITO TOTAL! El modelo V4 ya está en la nube de Roboflow.")
    print("Ya puedes entrar a la web de Roboflow y usar 'Auto-Label'.")
else:
    print(f"❌ ERROR: No encontré el archivo en: {ruta_modelo}")
    print("💡 Tip: Verifica si el archivo está realmente en Descargas o si se movió de carpeta.")