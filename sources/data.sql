------------------------------------------------------
-- 1) USUARIOS
------------------------------------------------------
INSERT INTO usuarios (id, email, password_hash, contacto_celular, nombre, apellido, rol)
VALUES
(1,  'adelante@gmail.com', '$2b$10$wq.D5pw1/0KK3TELCKyQTezDu0kcPyE.D2YV3aHvV5Jsw6XPSPZZm', '3101110001', 'Salga', 'Adelante', 'administrador'),

(3,  'ana.martinez@example.com',    'hash1', '3101110001', 'Ana',      'Martínez', 'emprendedor'),
(4,  'juan.lopez@example.com',      'hash2', '3101110002', 'Juan',     'López',    'emprendedor'),
(5,  'carla.gomez@example.com',     'hash3', '3101110003', 'Carla',    'Gómez',    'emprendedor'),
(6,  'mario.ramirez@example.com',   'hash4', '3101110004', 'Mario',    'Ramírez',  'emprendedor'),
(7,  'laura.mendez@example.com',    'hash5', '3101110005', 'Laura',    'Méndez',   'emprendedor'),
(8,  'santiago.velez@example.com',  'hash6', '3101110006', 'Santiago', 'Vélez',    'emprendedor'),
(9,  'isabel.diaz@example.com',     'hash7', '3101110007', 'Isabel',   'Díaz',     'emprendedor'),
(10, 'andres.rivera@example.com',   'hash8', '3101110008', 'Andrés',   'Rivera',   'emprendedor'),
(11, 'sofia.castro@example.com',    'hash9', '3101110009', 'Sofía',    'Castro',   'emprendedor'),
(12, 'diego.torres@example.com',    'hash10','3101110010', 'Diego',    'Torres',   'emprendedor'),
(13, 'carolina.rios@example.com',   'hash11','3101110011', 'Carolina', 'Ríos',     'emprendedor'),
(14, 'felipe.perez@example.com',    'hash12','3101110012', 'Felipe',   'Pérez',    'emprendedor'),
(15, 'mariana.santos@example.com',  'hash13','3101110013', 'Mariana',  'Santos',   'emprendedor'),
(16, 'roberto.castillo@example.com','hash14','3101110014', 'Roberto',  'Castillo', 'emprendedor'),
(17, 'valentina.oro@example.com',   'hash15','3101110015', 'Valentina','Oro',      'emprendedor');

------------------------------------------------------
-- 2) EMPRENDIMIENTOS
------------------------------------------------------
INSERT INTO emprendimientos (id, usuario_id, nombre_emprendimiento, año_creacion, sector_economico, nombre_encargado, contacto_encargado, email_encargado, tiempo_operacion_meses)
VALUES
(3, 3,  'Panadería La Esquina',      2022, 'comercio',     'Ana Martínez',     '3101110001', 'ana.martinez@example.com',    '12_24_meses'),
(4, 4,  'EcoLimpio Servicios',       2021, 'servicios',    'Juan López',       '3101110002', 'juan.lopez@example.com',      'mas_24_meses'),
(5, 5,  'Té Verde Cafetería',        2024, 'servicios',    'Carla Gómez',      '3101110003', 'carla.gomez@example.com',     '0_6_meses'),
(6, 6,  'Artesanías del Valle',      2019, 'manufactura',  'Mario Ramírez',    '3101110004', 'mario.ramirez@example.com',   'mas_24_meses'),
(7, 7,  'AppEduca',                  2023, 'tecnologia',   'Laura Méndez',     '3101110005', 'laura.mendez@example.com',    '6_12_meses'),
(8, 8,  'Huerto Urbano S.A.S.',      2020, 'agricultura',  'Santiago Vélez',   '3101110006', 'santiago.velez@example.com',  '12_24_meses'),
(9, 9,  'Moda Sostenible',           2022, 'manufactura',  'Isabel Díaz',      '3101110007', 'isabel.diaz@example.com',     '12_24_meses'),
(10,10, 'Desinfecc Express',         2020, 'servicios',    'Andrés Rivera',    '3101110008', 'andres.rivera@example.com',   'mas_24_meses'),
(11,11, 'Estudio Creativo 9',        2021, 'servicios',    'Sofía Castro',     '3101110009', 'sofia.castro@example.com',    '12_24_meses'),
(12,12, 'Bicicletas ECO',            2018, 'manufactura',  'Diego Torres',     '3101110010', 'diego.torres@example.com',    'mas_24_meses'),
(13,13, 'Consultoría PyME',          2024, 'servicios',    'Carolina Ríos',    '3101110011', 'carolina.rios@example.com',   '0_6_meses'),
(14,14, 'Panela Artesanal',          2019, 'manufactura',  'Felipe Pérez',     '3101110012', 'felipe.perez@example.com',    'mas_24_meses'),
(15,15, 'Guardería Felices',         2021, 'servicios',    'Mariana Santos',   '3101110013', 'mariana.santos@example.com',  '12_24_meses'),
(16,16, 'Reciclaje Creativo',        2023, 'otro',         'Roberto Castillo', '3101110014', 'roberto.castillo@example.com','6_12_meses'),
(17,17, 'Tienda Online 24/7',        2020, 'comercio',     'Valentina Oro',    '3101110015', 'valentina.oro@example.com',   '12_24_meses');

------------------------------------------------------
-- 3) MODELO DE NEGOCIO
------------------------------------------------------
INSERT INTO modelo_negocio (emprendimiento_id, propuesta_valor, segmento_clientes, canales_venta, fuentes_ingreso)
VALUES
(3,  'Pan artesanal con ingredientes locales', 'Vecinos y cafeterías locales', 'Venta directa, pedidos telefónicos', 'Venta por unidad y pedidos recurrentes'),
(4,  'Servicios de limpieza ecológica', 'Hogares y oficinas', 'Contratos corporativos, redes sociales', 'Servicios mensuales y puntuales'),
(5,  'Cafetería saludable con té orgánico', 'Estudiantes y profesionales jóvenes', 'Local y delivery', 'Venta directa'),
(6,  'Artesanías con técnicas tradicionales', 'Turistas y tiendas', 'Ferias, marketplaces', 'Venta minorista'),
(7,  'App educativa para primaria', 'Colegios y padres', 'Web y alianzas institucionales', 'Suscripciones'),
(8,  'Huertos urbanos para hogares y empresas', 'Co-workings y familias', 'Talleres y servicios', 'Kits y mantenimiento'),
(9,  'Moda con materiales reciclados', 'Consumidores ecológicos', 'Tienda online', 'Venta por unidad'),
(10, 'Desinfección rápida profesional', 'Restaurantes y oficinas', 'Contratos B2B', 'Servicio por visita'),
(11, 'Agencia de diseño y branding', 'Pymes y startups', 'Portafolio web', 'Proyectos por contrato'),
(12, 'Bicicletas urbanas sostenibles', 'Commuters urbanos', 'Tienda física y talleres', 'Venta y mantenimiento'),
(13, 'Consultoría digital para pymes', 'Empresas pequeñas', 'Webinars y asesorías', 'Paquetes fijos'),
(14, 'Panela artesanal orgánica', 'Supermercados y ferias', 'Distribuidores', 'Venta por kilo'),
(15, 'Guardería bilingüe y lúdica', 'Padres trabajadores', 'Referencias y redes', 'Cuotas mensuales'),
(16, 'Reciclaje de residuos creativos', 'Empresas y hogares', 'Online y recolección', 'Venta y servicio de reciclaje'),
(17, 'E-commerce con atención 24/7', 'Compradores online', 'Plataforma web', 'Venta directa y afiliados');

------------------------------------------------------
-- 4) FINANZAS
------------------------------------------------------
INSERT INTO finanzas (emprendimiento_id, ventas_netas_mes, rentabilidad_mensual, fuentes_financiamiento, costos_fijos_mensuales)
VALUES
(3,  '1_3_smmlv',      'medio_1_smmlv',      'recursos_propios',  'medio_1_smmlv'),
(4,  '3_mas_smmlv',    '2_mas_smmlv',        'mixto',             '2_mas_smmlv'),
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

------------------------------------------------------
-- 5) EQUIPO DE TRABAJO
------------------------------------------------------
INSERT INTO equipo_trabajo (emprendimiento_id, nivel_formacion_empresarial, personal_capacitado, roles_definidos, cantidad_empleados)
VALUES
(3,  'tecnica_profesional',           TRUE,  TRUE,  4),
(4,  'administracion_emprendimiento', TRUE,  TRUE,  12),
(5,  'sin_formacion',                 FALSE, FALSE, 2),
(6,  'tecnica_profesional',           TRUE,  TRUE,  6),
(7,  'administracion_emprendimiento', TRUE,  TRUE,  5),
(8,  'tecnica_profesional',           TRUE,  TRUE,  8),
(9,  'tecnica_profesional',           TRUE,  TRUE,  3),
(10, 'administracion_emprendimiento', TRUE,  TRUE,  10),
(11, 'administracion_emprendimiento', TRUE,  TRUE,  4),
(12, 'tecnica_profesional',           TRUE,  TRUE,  7),
(13, 'sin_formacion',                 FALSE, FALSE, 1),
(14, 'tecnica_profesional',           TRUE,  FALSE, 5),
(15, 'administracion_emprendimiento', TRUE,  TRUE,  9),
(16, 'tecnica_profesional',           TRUE,  TRUE,  2),
(17, 'administracion_emprendimiento', TRUE,  TRUE,  3);

------------------------------------------------------
-- 6) CALIFICACIONES (calculadas según las reglas)
------------------------------------------------------
INSERT INTO calificaciones (emprendimiento_id, puntaje_datos_generales, puntaje_modelo_negocio, puntaje_finanzas, puntaje_equipo_trabajo, puntaje_impacto_social, puntaje_total, porcentaje_total, clasificacion_global)
VALUES
-- puntaje_datos_generales basado en tiempo_operacion
-- puntaje_finanzas calculado según rangos
-- puntaje_equipo_trabajo según formación/capacitación/roles
(3,  2, 0, 1, 3, 1, 7, 70.0, 'en_desarrollo'),
(4,  3, 0, 2, 4, 2, 11, 100.0, 'consolidado'),
(5,  0, 0, 0, 0, 0, 0, 0.0, 'idea_inicial'),
(6,  3, 0, 1, 3, 1, 8, 80.0, 'en_desarrollo'),
(7,  1, 0, 1, 4, 1, 7, 70.0, 'en_desarrollo'),
(8,  2, 0, 2, 3, 2, 9, 90.0, 'consolidado'),
(9,  2, 0, 1, 3, 1, 7, 70.0, 'en_desarrollo'),
(10, 3, 0, 2, 4, 2, 11, 100.0, 'consolidado'),
(11, 2, 0, 1, 4, 1, 8, 80.0, 'en_desarrollo'),
(12, 3, 0, 2, 3, 2, 10, 90.0, 'consolidado'),
(13, 0, 0, 1, 0, 0, 1, 10.0, 'idea_inicial'),
(14, 3, 0, 1, 2, 1, 7, 70.0, 'en_desarrollo'),
(15, 2, 0, 0, 4, 1, 7, 70.0, 'en_desarrollo'),
(16, 1, 0, 1, 3, 1, 6, 60.0, 'en_desarrollo'),
(17, 2, 0, 1, 4, 1, 8, 80.0, 'en_desarrollo');
