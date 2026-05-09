-- Schema for BiteBoss POS System
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE estado_operativo AS ENUM ('ABIERTO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO');
CREATE TYPE estado_financiero AS ENUM ('SIN_PAGAR', 'PAGADO', 'PAGO_PARCIAL', 'REEMBOLSADO');
CREATE TYPE estado_linea AS ENUM ('PENDIENTE', 'ENTREGADO', 'CANCELADO');
CREATE TYPE tipo_pago_enum AS ENUM ('VENTA', 'REEMBOLSO');

-- Create tables
CREATE TABLE sucursal (
    id_sucursal SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipo_orden (
    id_tipo_orden SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL -- 'dine-in', 'takeout', 'delivery'
);

CREATE TABLE sucursal_tipo_orden (
    id_sucursal_tipo_orden SERIAL PRIMARY KEY,
    id_sucursal INTEGER REFERENCES sucursal(id_sucursal),
    id_tipo_orden INTEGER REFERENCES tipo_orden(id_tipo_orden),
    activo BOOLEAN DEFAULT true,
    UNIQUE(id_sucursal, id_tipo_orden)
);

CREATE TABLE mesa (
    id_mesa SERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    capacidad INTEGER DEFAULT 4,
    id_sucursal INTEGER REFERENCES sucursal(id_sucursal),
    activo BOOLEAN DEFAULT true,
    UNIQUE(id_sucursal, numero)
);

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    id_sucursal INTEGER REFERENCES sucursal(id_sucursal),
    rol VARCHAR(50) DEFAULT 'mesero', -- 'admin', 'mesero', 'cocinero', 'cajero'
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE producto (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    id_categoria INTEGER REFERENCES categoria(id_categoria),
    id_sucursal INTEGER REFERENCES sucursal(id_sucursal),
    disponible BOOLEAN DEFAULT true,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pedido (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuario(id_usuario),
    total DECIMAL(10,2) DEFAULT 0,
    id_sucursal_tipo_orden INTEGER REFERENCES sucursal_tipo_orden(id_sucursal_tipo_orden),
    id_sucursal INTEGER REFERENCES sucursal(id_sucursal),
    estado_operativo estado_operativo DEFAULT 'ABIERTO',
    estado_financiero estado_financiero DEFAULT 'SIN_PAGAR',
    nombre_cliente VARCHAR(100),
    apellido_cliente VARCHAR(100),
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP
);

CREATE TABLE pedido_mesa (
    id_pedido_mesa SERIAL PRIMARY KEY,
    id_mesa INTEGER REFERENCES mesa(id_mesa),
    id_pedido INTEGER REFERENCES pedido(id_pedido),
    UNIQUE(id_pedido) -- One mesa per pedido
);

CREATE TABLE pedido_producto (
    id_pedido_producto SERIAL PRIMARY KEY,
    id_pedido INTEGER REFERENCES pedido(id_pedido),
    id_producto INTEGER REFERENCES producto(id_producto),
    id_usuario_agrega INTEGER REFERENCES usuario(id_usuario),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario_entrega INTEGER REFERENCES usuario(id_usuario),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    estado_linea estado_linea DEFAULT 'PENDIENTE',
    entregado_en TIMESTAMP,
    cancelado_en TIMESTAMP,
    nota TEXT
);

CREATE TABLE tipo_pago (
    id_tipo_pago SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL -- 'efectivo', 'tarjeta', 'transferencia', etc.
);

CREATE TABLE sucursal_metodo_pago (
    id_sucursal_pago SERIAL PRIMARY KEY,
    id_sucursal INTEGER REFERENCES sucursal(id_sucursal),
    id_tipo_pago INTEGER REFERENCES tipo_pago(id_tipo_pago),
    activo BOOLEAN DEFAULT true,
    UNIQUE(id_sucursal, id_tipo_pago)
);

CREATE TABLE pago_pedido (
    id_pago_pedido SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuario(id_usuario),
    id_pedido INTEGER REFERENCES pedido(id_pedido),
    id_metodo_pago INTEGER REFERENCES tipo_pago(id_tipo_pago),
    propina DECIMAL(10,2) DEFAULT 0,
    monto DECIMAL(10,2) NOT NULL,
    nota TEXT,
    tipo_pago tipo_pago_enum DEFAULT 'VENTA',
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO tipo_orden (nombre) VALUES ('dine-in'), ('takeout'), ('delivery');

INSERT INTO tipo_pago (nombre) VALUES ('efectivo'), ('tarjeta'), ('transferencia'), ('qr');

INSERT INTO sucursal (nombre, direccion, telefono) VALUES
('Sucursal Principal', 'Calle Principal 123', '555-0123');

INSERT INTO sucursal_tipo_orden (id_sucursal, id_tipo_orden) VALUES
(1, 1), (1, 2), (1, 3); -- All order types for main branch

INSERT INTO sucursal_metodo_pago (id_sucursal, id_tipo_pago) VALUES
(1, 1), (1, 2), (1, 3), (1, 4); -- All payment methods for main branch

INSERT INTO mesa (numero, capacidad, id_sucursal) VALUES
(1, 4, 1), (2, 4, 1), (3, 6, 1), (4, 2, 1), (5, 8, 1);

INSERT INTO categoria (nombre, descripcion) VALUES
('Comidas', 'Platos principales'),
('Bebidas', 'Bebidas y refrescos'),
('Postres', 'Postres y dulces'),
('Entradas', 'Entradas y aperitivos');

INSERT INTO producto (nombre, descripcion, precio, id_categoria, id_sucursal) VALUES
('Hamburguesa Clásica', 'Hamburguesa con queso, lechuga y tomate', 12.50, 1, 1),
('Pizza Margarita', 'Pizza con queso mozzarella y albahaca', 15.00, 1, 1),
('Coca Cola', 'Refresco de cola 355ml', 3.50, 2, 1),
('Agua Mineral', 'Agua embotellada 500ml', 2.00, 2, 1),
('Tiramisú', 'Postre italiano con café', 8.00, 3, 1),
('Ensalada César', 'Ensalada con pollo y aderezo césar', 10.00, 4, 1);

INSERT INTO proveedor (nombre, email, telefono, direccion) VALUES
('Proveedor ABC', 'contacto@proveedorabc.com', '555-1001', 'Calle Distribuidora 456'),
('Frutas y Verduras XYZ', 'ventas@frutasxyz.com', '555-1002', 'Avenida Agrícola 789');

-- Create indexes for better performance
CREATE INDEX idx_pedido_sucursal ON pedido(id_sucursal);
CREATE INDEX idx_pedido_estado ON pedido(estado_operativo);
CREATE INDEX idx_pedido_producto_pedido ON pedido_producto(id_pedido);
CREATE INDEX idx_pago_pedido_pedido ON pago_pedido(id_pedido);
CREATE INDEX idx_producto_sucursal ON producto(id_sucursal);
CREATE INDEX idx_usuario_sucursal ON usuario(id_sucursal);
CREATE INDEX idx_proveedor_activo ON proveedor(activo);