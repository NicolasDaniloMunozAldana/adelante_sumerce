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
    apellido VARCHAR(100)
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
