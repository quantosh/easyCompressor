# Easy Compressor

**Easy Compressor** es una extensión para navegador que te permite aplicar compresión dinámica de audio en cualquier pestaña, con medidor visual y controles avanzados.

## Instalación manual y releases para cada navegador

> **Nota:** Esta extensión no está publicada en la Chrome Web Store porque Google exige un pago para publicar, lo cual no es viable para un proyecto gratuito y de código abierto. Puedes instalarla manualmente o descargar el ZIP listo para tu navegador desde la sección de releases.

### 1. Descarga el ZIP correcto para tu navegador

Ve a la sección [Releases](https://github.com/quantosh/easyCompressor/releases) y descarga:
- `Easy.Compressor-chrome.zip` para Chrome
- `Easy.Compressor-edge.zip` para Edge
- `Easy.Compressor-firefox.zip` para Firefox

Cada ZIP contiene el manifest adecuado para ese navegador.

### 2. Instala la extensión manualmente

**Chrome/Edge:**
- Ve a `chrome://extensions/`
- Activa el modo **Desarrollador**
- Haz clic en **"Cargar descomprimida"** y selecciona la carpeta descomprimida

**Firefox:**
- Ve a `about:addons`
- Haz clic en el engranaje > **Instalar complemento desde archivo...** y selecciona el ZIP

## Uso

- Haz clic en el icono de la extensión para abrir el popup.
- Pulsa **Enable Compressor** para activar la compresión en la pestaña actual.
- Pulsa **Settings** para ajustar el umbral, ratio y ver el vumeter con la reducción de ganancia en tiempo real.

## ¿Por qué no está en la Web Store?

Google exige un pago para publicar extensiones, incluso gratuitas. Este proyecto es open source y no tiene ánimo de lucro, por lo que solo está disponible para instalación manual.

## Multi-navegador

- Elige el ZIP adecuado para tu navegador en la sección de releases.
- El código fuente es el mismo para todos, solo cambia el manifest.

## Créditos

Desarrollado por [quantosh](https://github.com/quantosh) y colaboradores.

# Guía de colaboración para easyCompressor

## Flujo de trabajo con ramas

Para mantener la calidad y estabilidad del proyecto, hemos implementado las siguientes reglas de trabajo con ramas:

### 1. Rama principal (`main`)
- **No se permite hacer push directo a `main`.**
- Todos los cambios en `main` deben llegar a través de _Pull Requests_ (PR) provenientes de otras ramas, preferiblemente desde `dev`.
- Los PRs serán revisados antes de fusionarse (merge) a `main`.
- Solo se fusionan a `main` cambios que forman parte de una versión estable o un release.

### 2. Rama de desarrollo (`dev`)
- El desarrollo activo debe hacerse en la rama `dev`.
- Se permite hacer push directo a `dev`.
- Cuando se considere que el código en `dev` está listo para una nueva versión estable, se debe crear un _Pull Request_ de `dev` a `main`.

### 3. Cómo contribuir

1. Haz tus cambios en una rama basada en `dev` (puedes crear ramas de características o bugfix si lo prefieres).
2. Cuando termines, haz push a tu rama y crea un _Pull Request_ hacia `dev`.
3. Solo cuando se vaya a publicar una nueva versión, se debe crear un _Pull Request_ de `dev` a `main`.
4. No intentes hacer push directo a `main`: GitHub lo impedirá.

### Resumen visual

```
main   <---  PR (solo releases)
 ^
 |
dev  <---  push directo permitido
```

Si tienes dudas, pregunta antes de abrir un PR.

---

¡Gracias por contribuir y ayudar a mantener un flujo de trabajo ordenado!

---

¡Gracias por usar software libre!

---

[English README here](README.en.md)
