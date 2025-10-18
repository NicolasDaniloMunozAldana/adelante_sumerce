# Layout System - Salga Adelante Sumercé

## Descripción
Sistema de layout reutilizable con header, sidebar y footer para la aplicación "Salga Adelante Sumercé".

## Estructura de Archivos

### Partials (Reutilizables)
- `src/views/partials/header.ejs` - Encabezado HTML con meta tags y estilos
- `src/views/partials/navbar.ejs` - Header, sidebar y apertura del contenedor principal
- `src/views/partials/footer.ejs` - Footer y cierre de HTML

### Páginas Creadas
- `src/views/home.ejs` - Página de inicio
- `src/views/caracterizacion.ejs` - Página de caracterización
- `src/views/dashboard.ejs` - Página de dashboard
- `src/views/soporte.ejs` - Página de soporte
- `src/views/contacto.ejs` - Página de contacto

### Estilos
- `public/css/layout.css` - Estilos del layout (header, sidebar, footer)
- `public/css/login.css` - Estilos del login (sin modificar)

### Rutas
- `src/routes/homeRoutes.js` - Rutas para las nuevas páginas
- `src/controllers/homeController.js` - Controladores para las nuevas páginas

## Cómo Usar el Layout en Nuevas Páginas

Para crear una nueva página que use el layout:

1. Crea un nuevo archivo EJS en `src/views/`, por ejemplo `mi-pagina.ejs`

2. Usa esta estructura:

```ejs
<%- include('partials/header') %>
<%- include('partials/navbar') %>

<!-- Tu contenido aquí -->
<div class="breadcrumb">
    <span class="breadcrumb-item">> Mi Página</span>
</div>

<div class="page-section">
    <h1 class="page-title">Título de Mi Página</h1>
    <p class="page-description">Descripción de la página</p>
    
    <div class="page-content">
        <!-- Contenido de la página -->
    </div>
</div>

<%- include('partials/footer') %>

<style>
/* Estilos específicos de esta página (opcional) */
</style>
```

3. Agrega la ruta en `src/routes/homeRoutes.js`:

```javascript
router.get('/mi-pagina', homeController.showMiPagina);
```

4. Agrega el controlador en `src/controllers/homeController.js`:

```javascript
exports.showMiPagina = (req, res) => {
    res.render('mi-pagina', {
        title: 'Mi Página - Salga Adelante Sumercé',
        currentPage: 'mi-pagina'
    });
};
```

## Características del Layout

### Header
- Logo de la aplicación
- Título "Salga Adelante Sumercé"
- Botón "Iniciar Sesión"
- Avatar de usuario

### Sidebar
- Navegación con tres opciones:
  - Inicio
  - Caracterización
  - Dashboard
- Resalta automáticamente la página activa mediante la variable `currentPage`

### Footer
- Versión de la aplicación
- Enlaces a Soporte y Contacto
- Copyright

## Estilos

El layout usa la misma paleta de colores y fuentes que el login:
- Fuente: Poppins
- Colores principales:
  - Azul primario: #0033ff
  - Azul oscuro: #1a2849
  - Gris texto: #1a2332
  - Fondo degradado: linear-gradient(135deg, #f5f7fa 0%, #e8edf2 100%)

## Responsive Design

El layout es completamente responsive:
- Desktop: Layout completo con sidebar de 240px
- Tablet (< 1024px): Sidebar reducido a 200px
- Mobile (< 768px): Sidebar reducido a 180px
- Mobile pequeño (< 640px): Sidebar oculto

## Rutas Disponibles

- `/home` - Página de inicio
- `/caracterizacion` - Página de caracterización
- `/dashboard` - Dashboard
- `/soporte` - Página de soporte
- `/contacto` - Página de contacto

## Navegación del Sidebar

Para que un elemento del sidebar aparezca activo, pasa la variable `currentPage` desde el controlador:

```javascript
res.render('nombre-pagina', {
    title: 'Título',
    currentPage: 'home' // o 'caracterizacion', 'dashboard'
});
```

## Notas Importantes

- NO modifiques los archivos de autenticación (login, register, forgot-password)
- Los estilos de cada página se pueden incluir dentro del archivo EJS usando etiquetas `<style>`
- Para estilos globales, usa `public/css/layout.css`
- Las imágenes deben estar en la carpeta `public/`

## Iniciar el Servidor

```bash
npm start
```

O en modo desarrollo:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3030`
