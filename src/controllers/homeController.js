// Mostrar la página de inicio
exports.showHome = (req, res) => {
    res.render('home/home', {
        title: 'Inicio - Salga Adelante Sumercé',
        currentPage: 'home'
    });
};

// Mostrar la página de caracterización
exports.showCaracterizacion = (req, res) => {
    res.render('home/caracterizacion', {
        title: 'Caracterización - Salga Adelante Sumercé',
        currentPage: 'caracterizacion'
    });
};

// Mostrar la página de dashboard
exports.showDashboard = (req, res) => {
    res.render('home/dashboard', {
        title: 'Dashboard - Salga Adelante Sumercé',
        currentPage: 'dashboard'
    });
};

// Mostrar la página de soporte
exports.showSoporte = (req, res) => {
    res.render('home/soporte', {
        title: 'Soporte - Salga Adelante Sumercé',
        currentPage: 'soporte'
    });
};

// Mostrar la página de contacto
exports.showContacto = (req, res) => {
    res.render('home/contacto', {
        title: 'Contacto - Salga Adelante Sumercé',
        currentPage: 'contacto'
    });
};
