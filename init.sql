-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS adelante_sumerce;
USE adelante_sumerce;

-- Tabla de usuarios/emprendedores
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    contacto_celular VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    rol ENUM('emprendedor', 'administrador') DEFAULT 'emprendedor'
);

-- Tabla de emprendimientos
CREATE TABLE emprendimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre_emprendimiento VARCHAR(255) NOT NULL,
    año_creacion INT,
    sector_economico VARCHAR(100),
    nombre_encargado VARCHAR(200),
    contacto_encargado VARCHAR(20),
    email_encargado VARCHAR(255),
    tiempo_operacion_meses ENUM('0_6_meses', '6_12_meses', '12_24_meses', 'mas_24_meses'),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla para sección B: Modelo de Negocio
CREATE TABLE modelo_negocio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emprendimiento_id INT NOT NULL,
    propuesta_valor TEXT,
    segmento_clientes TEXT,
    canales_venta TEXT,
    fuentes_ingreso TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emprendimiento_id) REFERENCES emprendimientos(id) ON DELETE CASCADE
);

-- Tabla para sección C: Finanzas
CREATE TABLE finanzas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emprendimiento_id INT NOT NULL,
    ventas_netas_mes ENUM('menos_1_smmlv', '1_3_smmlv', '3_mas_smmlv'),
    rentabilidad_mensual ENUM('menos_medio_smmlv', 'medio_1_smmlv', '2_mas_smmlv'),
    fuentes_financiamiento ENUM('recursos_propios', 'credito_bancario', 'inversionistas', 'subsidios', 'mixto'),
    costos_fijos_mensuales ENUM('menos_medio_smmlv', 'medio_1_smmlv', '2_mas_smmlv'),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emprendimiento_id) REFERENCES emprendimientos(id) ON DELETE CASCADE
);

-- Tabla para sección D: Equipo de Trabajo
CREATE TABLE equipo_trabajo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emprendimiento_id INT NOT NULL,
    nivel_formacion_empresarial ENUM('sin_formacion', 'tecnica_profesional', 'administracion_emprendimiento'),
    personal_capacitado BOOLEAN,
    roles_definidos BOOLEAN,
    cantidad_empleados INT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emprendimiento_id) REFERENCES emprendimientos(id) ON DELETE CASCADE
);

-- Tabla para sección E: Impacto Social y Ambiental
CREATE TABLE impacto_social_ambiental (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emprendimiento_id INT NOT NULL,
    empleos_generados INT DEFAULT 0,
    contribucion_ambiental BOOLEAN,
    estrategias_ambientales TEXT,
    innovacion_social BOOLEAN,
    implementacion_innovacion TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emprendimiento_id) REFERENCES emprendimientos(id) ON DELETE CASCADE
);

-- Tabla de puntajes y calificaciones
CREATE TABLE calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emprendimiento_id INT NOT NULL,
    puntaje_datos_generales INT DEFAULT 0,
    puntaje_modelo_negocio INT DEFAULT 0,
    puntaje_finanzas INT DEFAULT 0,
    puntaje_equipo_trabajo INT DEFAULT 0,
    puntaje_impacto_social INT DEFAULT 0,
    puntaje_total INT DEFAULT 0,
    porcentaje_total DECIMAL(5,2) DEFAULT 0,
    clasificacion_global ENUM('idea_inicial', 'en_desarrollo', 'consolidado'),
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emprendimiento_id) REFERENCES emprendimientos(id) ON DELETE CASCADE
);

-- Tabla para logs de actividades del administrador
CREATE TABLE logs_administrador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accion VARCHAR(255) NOT NULL,
    detalles TEXT,
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para exportaciones/reportes
CREATE TABLE reportes_generados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_reporte VARCHAR(255) NOT NULL,
    tipo_reporte ENUM('excel', 'pdf'),
    filtros_aplicados TEXT,
    ruta_archivo VARCHAR(500),
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



INSERT INTO usuarios (id, email, password_hash, contacto_celular, nombre, apellido, rol)
VALUES
(1,  'adelante@gmail.com',    '$2b$10$wq.D5pw1/0KK3TELCKyQTezDu0kcPyE.D2YV3aHvV5Jsw6XPSPZZm', '3101110001', 'Salga Adelante', 'Adelante Sumerce', 'administrador');

INSERT INTO usuarios (id, email, password_hash, contacto_celular, nombre, apellido, rol)
VALUES
(3,  'ana.martinez@example.com',    'password_hash_1', '3101110001', 'Ana',      'Martínez', 'emprendedor'),
(4,  'juan.lopez@example.com',       'password_hash_2', '3101110002', 'Juan',     'López',    'emprendedor'),
(5,  'carla.gomez@example.com',      'password_hash_3', '3101110003', 'Carla',    'Gómez',    'emprendedor'),
(6,  'mario.ramirez@example.com',    'password_hash_4', '3101110004', 'Mario',    'Ramírez',  'emprendedor'),
(7,  'laura.mendez@example.com',     'password_hash_5', '3101110005', 'Laura',    'Méndez',   'emprendedor'),
(8,  'santiago.velez@example.com',   'password_hash_6', '3101110006', 'Santiago', 'Vélez',    'emprendedor'),
(9,  'isabel.diaz@example.com',      'password_hash_7', '3101110007', 'Isabel',   'Díaz',     'emprendedor'),
(10, 'andres.rivera@example.com',    'password_hash_8', '3101110008', 'Andrés',   'Rivera',   'emprendedor'),
(11, 'sofia.castro@example.com',     'password_hash_9', '3101110009', 'Sofía',    'Castro',   'emprendedor'),
(12, 'diego.torres@example.com',     'password_hash_10','3101110010', 'Diego',    'Torres',   'emprendedor'),
(13, 'carolina.rios@example.com',    'password_hash_11','3101110011', 'Carolina', 'Ríos',     'emprendedor'),
(14, 'felipe.perez@example.com',     'password_hash_12','3101110012', 'Felipe',   'Pérez',    'emprendedor'),
(15, 'mariana.santos@example.com',   'password_hash_13','3101110013', 'Mariana',  'Santos',   'emprendedor'),
(16, 'roberto.castillo@example.com', 'password_hash_14','3101110014', 'Roberto',  'Castillo', 'emprendedor'),
(17, 'valentina.oro@example.com',    'password_hash_15','3101110015', 'Valentina','Oro',      'emprendedor');


INSERT INTO emprendimientos (id, usuario_id, nombre_emprendimiento, año_creacion, sector_economico, nombre_encargado, contacto_encargado, email_encargado, tiempo_operacion_meses)
VALUES
(3,  3,  'Panadería La Esquina',        2022, 'comercio',       'Ana Martínez',     '3101110001', 'ana.martinez@example.com',    '12_24_meses'),
(4,  4,  'EcoLimpio Servicios',         2021, 'servicios',      'Juan López',       '3101110002', 'juan.lopez@example.com',      'mas_24_meses'),
(5,  5,  'Té Verde Cafetería',          2024, 'servicios',      'Carla Gómez',      '3101110003', 'carla.gomez@example.com',     '0_6_meses'),
(6,  6,  'Artesanías del Valle',        2019, 'manufactura',    'Mario Ramírez',    '3101110004', 'mario.ramirez@example.com',   'mas_24_meses'),
(7,  7,  'AppEduca',                    2023, 'tecnologia',     'Laura Méndez',     '3101110005', 'laura.mendez@example.com',    '6_12_meses'),
(8,  8,  'Huerto Urbano S.A.S.',        2020, 'agricultura',    'Santiago Vélez',   '3101110006', 'santiago.velez@example.com',  '12_24_meses'),
(9,  9,  'Moda Sostenible',             2022, 'manufactura',    'Isabel Díaz',      '3101110007', 'isabel.diaz@example.com',     '12_24_meses'),
(10, 10, 'Desinfecc Express',           2020, 'servicios',      'Andrés Rivera',    '3101110008', 'andres.rivera@example.com',   'mas_24_meses'),
(11, 11, 'Estudio Creativo 9',          2021, 'servicios',      'Sofía Castro',     '3101110009', 'sofia.castro@example.com',    '12_24_meses'),
(12, 12, 'Bicicletas ECO',              2018, 'manufactura',    'Diego Torres',     '3101110010', 'diego.torres@example.com',    'mas_24_meses'),
(13, 13, 'Consultoría PyME',            2024, 'servicios',      'Carolina Ríos',    '3101110011', 'carolina.rios@example.com',   '0_6_meses'),
(14, 14, 'Panela Artesanal',            2019, 'manufactura',    'Felipe Pérez',     '3101110012', 'felipe.perez@example.com',    'mas_24_meses'),
(15, 15, 'Guardería Felices',           2021, 'servicios',      'Mariana Santos',   '3101110013', 'mariana.santos@example.com',  '12_24_meses'),
(16, 16, 'Reciclaje Creativo',          2023, 'otro',           'Roberto Castillo', '3101110014', 'roberto.castillo@example.com','6_12_meses'),
(17, 17, 'Tienda Online 24/7',          2020, 'comercio',       'Valentina Oro',    '3101110015', 'valentina.oro@example.com',   '12_24_meses');


INSERT INTO modelo_negocio (emprendimiento_id, propuesta_valor, segmento_clientes, canales_venta, fuentes_ingreso)
VALUES
(3,  'Pan fresco artesanal diario, ingredientes locales', 'Vecinos y cafeterías locales', 'Venta directa, pedidos por teléfono', 'Venta por unidad, pedidos recurrentes'),
(4,  'Limpieza ecológica sin químicos agresivos', 'Hogares y oficinas preocupados por el ambiente', 'Contratos corporativos, redes sociales', 'Contratos mensuales, servicios puntuales'),
(5,  'Cafetería con té orgánico y snacks saludables', 'Jóvenes profesionales y estudiantes', 'Local, delivery', 'Venta en local, venta por delivery'),
(6,  'Artesanías hechas a mano con técnicas tradicionales', 'Turistas y tiendas de regalos', 'Ferias, marketplace', 'Venta al por menor, comisiones'),
(7,  'Plataforma educativa para primaria', 'Padres y colegios', 'App/web, alianzas institucionales', 'Suscripciones, licencias escolares'),
(8,  'Huertos urbanos para hogares y empresas', 'Hogares y co-workings', 'Servicio presencial, talleres', 'Venta de kits, talleres, suscripción mantenimiento'),
(9,  'Ropa con materiales reciclados', 'Consumidor consciente', 'Tienda online, pop-up stores', 'Venta unidades, pedidos por volumen'),
(10, 'Servicio de desinfección rápida', 'Restaurantes y oficinas', 'Contratos B2B, llamada directa', 'Servicio por visita, contratos de mantenimiento'),
(11, 'Agencia de diseño y contenidos', 'Startups y pymes', 'Portafolio online, networking', 'Proyectos por contrato, retainer mensual'),
(12, 'Bicicletas urbanas con mantenimiento incluido', 'Commuters urbanos', 'Tienda física, talleres', 'Venta bicicletas, servicio posventa'),
(13, 'Consultoría para digitalización PyME', 'Pequeñas empresas', 'Reuniones, webinars', 'Proyectos por hora, paquetes fijos'),
(14, 'Panela artesanal orgánica', 'Mercados locales y supermercados', 'Ferias, distribuidores', 'Venta por kilo, contratos con tiendas'),
(15, 'Guardería con enfoque lúdico y bilingüe', 'Padres trabajadores', 'Inscripciones directas, recomendaciones', 'Cuotas mensuales, talleres extra'),
(16, 'Reciclaje y productos de diseño con residuos', 'Empresas y consumidores creativos', 'Tienda online y puntos de acopio', 'Venta producto, recolección a domicilio'),
(17, 'Tienda online con envíos 24/7', 'Compradores en línea', 'E-commerce, redes', 'Venta por producto, afiliados');


INSERT INTO finanzas (emprendimiento_id, ventas_netas_mes, rentabilidad_mensual, fuentes_financiamiento, costos_fijos_mensuales)
VALUES
(3,  '1_3_smmlv',      'medio_1_smmlv',      'recursos_propios',  'menos_medio_smmlv'),
(4,  '3_mas_smmlv',    '2_mas_smmlv',        'mixto',             'medio_1_smmlv'),
(5,  'menos_1_smmlv',  'menos_medio_smmlv',  'recursos_propios',  'menos_medio_smmlv'),
(6,  '1_3_smmlv',      'medio_1_smmlv',      'inversionistas',    'medio_1_smmlv'),
(7,  '1_3_smmlv',      'medio_1_smmlv',      'credito_bancario',  'medio_1_smmlv'),
(8,  '3_mas_smmlv',    '2_mas_smmlv',        'subsidios',         '2_mas_smmlv'),
(9,  '1_3_smmlv',      'medio_1_smmlv',      'recursos_propios',  'medio_1_smmlv'),
(10, '3_mas_smmlv',    '2_mas_smmlv',        'mixto',             '2_mas_smmlv'),
(11, '1_3_smmlv',      'medio_1_smmlv',      'recursos_propios',  'menos_medio_smmlv'),
(12, '3_mas_smmlv',    '2_mas_smmlv',        'inversionistas',    '2_mas_smmlv'),
(13, '1_3_smmlv',      'medio_1_smmlv',      'recursos_propios',  'menos_medio_smmlv'),
(14, '1_3_smmlv',      'medio_1_smmlv',      'mixto',             'medio_1_smmlv'),
(15, 'menos_1_smmlv',  'menos_medio_smmlv',  'subsidios',         'menos_medio_smmlv'),
(16, '1_3_smmlv',      'medio_1_smmlv',      'credito_bancario',  'medio_1_smmlv'),
(17, '1_3_smmlv',      'medio_1_smmlv',      'recursos_propios',  'medio_1_smmlv');


INSERT INTO equipo_trabajo (emprendimiento_id, nivel_formacion_empresarial, personal_capacitado, roles_definidos, cantidad_empleados)
VALUES
(3,  'tecnica_profesional',            TRUE,  TRUE, 4),
(4,  'administracion_emprendimiento',  TRUE,  TRUE, 12),
(5,  'sin_formacion',                  FALSE, FALSE,2),
(6,  'sin_formacion',                  TRUE,  TRUE,6),
(7,  'administracion_emprendimiento',  TRUE,  TRUE,5),
(8,  'tecnica_profesional',            TRUE,  TRUE,8),
(9,  'tecnica_profesional',            TRUE,  TRUE,3),
(10, 'administracion_emprendimiento',  TRUE,  TRUE,10),
(11, 'administracion_emprendimiento',  TRUE,  TRUE,4),
(12, 'tecnica_profesional',            TRUE,  TRUE,7),
(13, 'sin_formacion',                  FALSE, FALSE,1),
(14, 'sin_formacion',                  TRUE,  FALSE,5),
(15, 'administracion_emprendimiento',  TRUE,  TRUE,9),
(16, 'tecnica_profesional',            TRUE,  TRUE,2),
(17, 'administracion_emprendimiento',  TRUE,  TRUE,3);


INSERT INTO calificaciones (emprendimiento_id, puntaje_datos_generales, puntaje_modelo_negocio, puntaje_finanzas, puntaje_equipo_trabajo, puntaje_impacto_social, puntaje_total, porcentaje_total, clasificacion_global)
VALUES
(3,  8, 10, 7,  8,  6,  39,  78.00, 'en_desarrollo'),
(4,  9, 10, 9, 10, 8,  46,  92.00, 'consolidado'),
(5,  6, 7,  5,  4,  3,  25,  50.00, 'idea_inicial'),
(6,  8, 9,  8,  7,  6,  38,  76.00, 'en_desarrollo'),
(7,  7, 8,  7,  7,  7,  36,  72.00, 'en_desarrollo'),
(8,  9, 9, 10, 9,  8,  45,  90.00, 'consolidado'),
(9,  7, 8,  6,  6,  7,  34,  68.00, 'en_desarrollo'),
(10, 9, 9, 10, 10, 7,  45,  90.00, 'consolidado'),
(11, 8, 8,  7,  8,  5,  36,  72.00, 'en_desarrollo'),
(12, 9, 10, 9,  9,  8,  45,  90.00, 'consolidado'),
(13, 6, 6,  5,  4,  3,  24,  48.00, 'idea_inicial'),
(14, 8, 7,  7,  6,  6,  34,  68.00, 'en_desarrollo'),
(15, 8, 8,  7,  9,  8,  40,  80.00, 'en_desarrollo'),
(16, 7, 7,  6,  5,  7,  32,  64.00, 'en_desarrollo'),
(17, 8, 8,  7,  6,  5,  34,  68.00, 'en_desarrollo');


-- Modificación de la base de datos para soportar JWT y refresh tokens

-- Tabla para almacenar refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expira_en DATETIME NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    revocado_en DATETIME NULL,
    reemplazado_por_token VARCHAR(500) NULL,
    ip_address VARCHAR(50) NULL,
    user_agent VARCHAR(500) NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_expira_en (expira_en),
    INDEX idx_revocado_en (revocado_en)
);

-- Índices adicionales para la tabla de usuarios para mejorar rendimiento
ALTER TABLE usuarios ADD INDEX idx_email (email);
ALTER TABLE usuarios ADD INDEX idx_rol (rol);
