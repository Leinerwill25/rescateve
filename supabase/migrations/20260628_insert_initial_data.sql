-- =====================================================================
-- RESCATE VE — Migración e Inserción de Datos Iniciales desde Producción
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- ==========================================
-- Tabla public.solicitudes_ayuda (18 registros)
-- ==========================================
INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('38dc6c4b-d125-4d48-b476-8f099dd6f9ed', '2026-06-25T17:20:36.019383+00:00', 'rescate', 'Se cayó un edificio, no nos han prestado el apoyo y hay 5 personas atrapadas', 10.617704, -66.854782, NULL, 5, 'alta', NULL, 'pendiente', NULL, NULL, '4fc1a9f8-0d5c-40df-86b9-890b4e92d69f', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('a5a0553d-9987-42d2-a9a8-b52ef655f907', '2026-06-25T18:16:47.677996+00:00', 'paramedico', 'Estoy herido en la calle y no me puedo levantar, soy de caracas pero estoy en catia la mar buscando a mi madre, necesito ayuda para poder volver a caracas', 10.60554, -67.021456, 'Catia la mar, frente a SUMA torre K21', 1, 'media', '04123608886', 'pendiente', 'Jorge Garcia', '04140286219', '6c0e1fe9-a125-4e8f-a731-185638ea564e', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('bef3a064-bdd2-4330-92f2-758512c0fca5', '2026-06-25T23:55:55.425514+00:00', 'rescate', 'Edificio Bellevue caraballeda, urbanización caribe, dos personas atrapadas Abel bello y su mamá ', 10.61237, -66.840634, 'Detrás de costa del sol ', 2, 'alta', '04149283601', 'pendiente', 'Contacto', '04149283601', '9d7a391d-d5ad-4446-8f5b-7de405d89ff5', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('f2266bdc-7d9b-42d0-87a1-5d36675aa874', '2026-06-26T01:13:45.986013+00:00', 'rescate', 'Edificio colapsado, hay muchas personas atrapadas en el piso 4', 10.61493, -66.839029, 'Residencias Caribe sector caribe, al lado de la misión vivienda la Guaira ', 3, 'alta', '+58 412-7213480, o +58 414-2714142', 'pendiente', 'Samuel Rivas', '04241244414', 'c50cd23c-ac07-402c-b223-cfdf11878255', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('92edba50-699d-4d2f-bc63-b13b2157619d', '2026-06-26T15:16:55.846187+00:00', 'rescate', 'Edificio colapsado hay 2 personas atrapadas', 10.611231, -66.829025, 'Residencias Tamar, avenida las Acacias, Tanaguarenas', 5, 'alta', '+54 11 41767445', 'pendiente', 'Mariana Cover', '+54 11 41767445', '9708d241-fe16-42b1-bea4-0f62bcd3e137', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('6137191b-8eb0-4699-9932-394047460af8', '2026-06-26T15:41:15.248828+00:00', 'rescate', ' No hay presencia de ningún servicio de seguridad ni protección a la ciudadanía ', 10.608883, -67.016892, 'Catia la mar playa grande ', 500, 'alta', NULL, 'pendiente', NULL, NULL, '4306f5a6-d0d6-40ec-ba18-223577710ec7', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('10b5f616-924b-45d0-8316-3dcfb737bba1', '2026-06-26T15:45:36.540305+00:00', 'rescate', 'Edif.ARICHUNA,Los Corales. No hay nadie moviendo escombros', 10.616537, -66.857407, 'Al lado o en frente del Canary Island ', 40, 'alta', NULL, 'pendiente', NULL, NULL, '82b978dd-fa76-489c-adaf-d8fd98e79372', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('bbc81064-cdd4-479e-b7fd-e4b987ccc7f4', '2026-06-26T16:14:55.587122+00:00', 'rescate', 'Edificio colapsado en Tanaguarenas. Edificio Costamar', 10.611136, -66.821587, 'Av La Playa, Edificio Costamar. Cerca del Club Tanaguarena', NULL, 'alta', NULL, 'pendiente', NULL, NULL, 'd4c75bca-622d-4578-8a71-d8dd2f472455', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('b6287ecd-ac23-42e8-8e5f-87d274e54e81', '2026-06-26T16:41:19.913025+00:00', 'rescate', 'Edificio colapsado', 10.610258, -67.012114, 'Residencia Los Corsarios', 2, 'alta', '04148165917', 'pendiente', 'Arleany Coa', '04148165917', 'ae66217d-078a-4b92-aa27-32ba91666951', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('18c9e606-ef4b-4117-8c95-54a9dc64956e', '2026-06-26T16:44:59.351046+00:00', 'rescate', 'Edificio colapsado y no hay personal de rescate', 10.610268, -67.011688, 'Residencias Oasis Beach Playa Grande', NULL, 'alta', NULL, 'pendiente', 'Gabriel Gomez', '04129735278', '39342e7b-3d62-40ee-938a-a26e490b5fd0', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('94966c62-dc9b-49a6-9d33-d8080523931e', '2026-06-26T17:13:00.269357+00:00', 'rescate', 'Personas bajo los escombros en Res. Arrecife Caraballeda. En la guaira. Ayuda por favor!!', 10.612839, -66.849812, 'CARABALLEDA, LA GUAIRA', 100, 'alta', '+58 412-3824380', 'pendiente', 'Wileidy Goyo', '04143791394', '2814c2d6-920e-4106-8597-ad86df709674', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('b0d5f507-965c-4a5a-9533-2d5add3ffd4f', '2026-06-26T18:22:34.15426+00:00', 'rescate', 'Edificio colapsado. Hay gente dentro y no ha llegado ayuda de expertos. Solo civiles ', 10.654414, -63.284914, 'Edificio Orca en playa grande. La guaira', 20, 'alta', NULL, 'pendiente', NULL, NULL, '7a7391a4-37de-45dd-a8a1-8f01da319cdb', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('ca562065-d9b7-40b8-9de1-0a7134af2157', '2026-06-26T18:41:41.983629+00:00', 'rescate', 'Guaira, calle principal Caraballeda, edificio Perla Mar. Personas adentro', 10.609973, -66.83228, 'Guaira, calle principal Caraballeda, edificio Perla Mar', 50, 'alta', '+58 412-2154256', 'pendiente', 'Ricardo Rendon', '+50371343837', '563dbfe3-bafa-45d1-b696-df6e89416b21', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('0d2e1183-c476-4acd-91be-56cd9974ac95', '2026-06-26T18:44:48.956898+00:00', 'rescate', 'Edificio Mediterranee necesitan apoyo de maquinaria pesada, equipos y apoyo para rescatar personas que se escuchan aún con vida de los escombros. Nro de contacto de familiares de los afectados: Angélica Marquéz: 0424-1312585', 10.49071, -66.113057, 'Edificio Mediterranee - Puerto viejo - La Guaira -Calle 4 maiquetia  1162 ', 25, 'alta', '04242764037 04141342826', 'pendiente', 'Kariannys Salazar', '04121819520', 'd86f8e4a-efbc-4042-a3c9-f7c441b9726e', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('39610b8f-1157-4c5e-9ce2-c2a764ab4aa0', '2026-06-26T19:34:10.193728+00:00', 'rescate', 'AYUDA! ESTA CON VIDA EN LOS ESCOMBROS
Edf Coral Mar Piso 3 La Guaira, Nayibeth Lima esta con VIDA, junto a su esposo y su niño de 5 años, se logro comunicar con un familiar que se encuentra bajo los escombros.', 10.600038, -66.929641, 'Edf Coral Mar La Guaira', 3, 'alta', '+598 94 608 982 whatsapp ', 'pendiente', 'Evelice', '+598 94 608 982', 'a45a5e91-cee7-4bad-b4a9-1ef148413338', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('3df88d2d-09fa-41ff-8324-88b9f369b45c', '2026-06-26T23:42:11.792239+00:00', 'rescate', 'Hotel Sanitario la Llanada hay personas gritando hace minutos su nombre, estan vivos ', 10.606475, -66.892285, 'Hotel Sanitario la Llanada', 5, 'alta', '04120226574', 'pendiente', NULL, NULL, '0fa48010-11d7-495e-8439-1eecf289b0f3', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('bfc8542e-d99f-4a0c-9ec4-e1479d317ec9', '2026-06-26T23:53:40.463324+00:00', 'rescate', 'Edificio colapsado y hay personas adentro.', 10.611201, -66.887421, 'Macuto, avenida la playa, sector Las Quince Letras, Estado La Guaira.', 10, 'alta', '04129554941', 'pendiente', 'Carlos Wilson', '0412-9554941', '693e7b72-855c-47e2-b326-4a56396a189c', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.solicitudes_ayuda (id, created_at, tipo, descripcion, latitud, longitud, referencia, personas_afectadas, prioridad, contacto, estado, reportado_por_nombre, reportado_por_contacto, reporter_token, respondido_por, en_camino_at, atendido_at, personas_rescatadas) 
VALUES ('1a90a45c-976d-4154-9117-e7dd780a8bf7', '2026-06-27T03:44:47.438618+00:00', 'rescate', 'Una muchacha esta con su hijo el primer piso', 10.998072, -63.821521, 'JX6M+65C, Av. del Hotel, Maiquetía 1162, La Guaira, Venezuela', NULL, 'alta', '2', 'pendiente', NULL, NULL, '7b4d1b2f-4b8e-4e12-a27f-5116d70c2c39', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- Tabla public.personas_desaparecidas (27 registros)
-- ==========================================
INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('5696ddf4-6049-43a0-9397-d4da82de7622', '2026-06-25T17:31:59.443684+00:00', 'Zugelyz Hernández', 27, NULL, NULL, 10.598897, -67.01786, NULL, '04242267552', 'desaparecido', NULL, '4fc1a9f8-0d5c-40df-86b9-890b4e92d69f', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('4e490b21-8ee8-4629-847a-b4cf885da10a', '2026-06-26T13:59:33.023772+00:00', 'Daniel Alejandro Nuñez Ramírez ', 29, 'Estatura media alta. Blanco contextura fuerte. Blanco con Chiva o barba, amable y humano ', 'La guaria llegó en el vuelo 164', 10.597076, -66.925921, NULL, '0414-0310448', 'desaparecido', 'Leida Ramírez', '34bc94d2-6ff0-4cb7-abc7-f05a27748e54', 'masculino', '1:75', 'media', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('c32600ba-b43b-48fb-9690-631654757516', '2026-06-26T14:27:57.227929+00:00', 'Dublin Salas', 60, '1.78', NULL, NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/0723bd56-3061-4786-9e8d-f7420a17faae.jpg', '04143313317', 'desaparecido', 'R. Izaguirre', '055a9cda-5f13-42b3-a7bf-05c3c6ede37a', 'masculino', NULL, 'media', 'Tatuaje brazo derecho ', 'Sano ', NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('388d3d4f-55b8-4e69-94cd-e2e9e35cc0e2', '2026-06-26T14:38:54.847142+00:00', 'Eulogia Gonzalez', 78, 'Franela blanca blue jean', 'Naiguata', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/1b8e8f67-d30e-4eff-bb95-86612c132a1c.jpg', '04147894464 WhatsApp ', 'desaparecido', 'Susana Mewa', '79880283-acc5-409d-8e1f-032a4c706cbb', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('342e3681-bb21-4aa0-a909-cd1d19f4d100', '2026-06-26T15:20:24.53198+00:00', 'Pedro peñalver ', 65, 'Alto cabello canoso moreno de unos 60 años ', NULL, 10.600038, -66.929641, NULL, '04127257497 elias Noguera ', 'desaparecido', 'Elias Noguera sobrino', 'a4a05917-decd-47ef-b2c4-fc1b25820d25', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('9ebe7c14-68bc-4c74-82fb-8df732646053', '2026-06-26T16:04:37.871898+00:00', 'Whitney Trujillo', 34, 'Bajita delgada morena, cabello rizo esta embarazada', 'Edificio Caribe en La Guaira', 10.202882, -64.638433, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/6b400581-0c6c-4940-b671-0f699d909a4c.jpg', '04242025900', 'desaparecido', 'Kira Pabon', 'db49940f-52de-4420-8b48-591ebd73924a', 'femenino', NULL, 'delgada', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('0bcbbddf-88ce-4d77-ac94-267a5bac3733', '2026-06-26T16:36:40.375018+00:00', 'Victoriano Sabala Quintero ', 79, 'Estatura aproximada 1.65', 'El Vive en Playa Grande Catia la Mar Edo. La Guaira ', 10.600038, -66.929641, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/42f9e91c-f468-4b49-99d0-a257c5d3b402.png', '04129092850', 'desaparecido', 'José Zabala', '93ad9335-12bf-4c63-aff9-649bfd8b51e3', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('79ef8826-a857-42a0-95aa-d6d7e878a81c', '2026-06-26T16:37:07.390724+00:00', 'Martha Quiroga', 77, 'Médico, estatura de 1.55cm aproximadamente, es súper delgada usa lentes ', 'Viven en La Guaira sector Mare abajo frente a playa surfista ', 10.608747, -66.981059, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/15dde9cf-aa94-4add-b56c-7dc4d0429f4c.jpg', '0424-4453473', 'desaparecido', 'Elizabeth Matiz', '5702c0ca-883f-42d9-9bab-eef4772e351c', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('3444760c-7a56-4893-9f39-9516c4c4936f', '2026-06-26T16:39:46.639855+00:00', 'Alexander Quiroga', 44, 'Mide como unos 1,80cm es alto ', 'Mare abajo frente a playa surfista La Guaira', 10.608747, -66.981059, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/e49dddc2-eca8-433a-9750-401ca5199691.jpg', '0424-4453473', 'desaparecido', 'Elizabeth Quiroga', '5702c0ca-883f-42d9-9bab-eef4772e351c', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('78900d77-d19d-413f-ae5d-e4f1a0472cba', '2026-06-26T16:46:20.724862+00:00', 'José Gregorio Carmona Ayrot ', 20, 'Caucásico, cabello medio corto oscuro. 1.80m de estatura, ojos oscuros. ', 'Residencias Malecón, sector Playa Grande. Catia la Mar ', 10.609332, -67.026165, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/bf6ee29c-ab8f-4787-afdb-db6448462f65.jpg', '+58 414-6839245', 'desaparecido', 'Gada Ayrot', '28f34a64-e0bd-473d-992c-8261a2bb4bc5', 'masculino', '1.80m', 'delgada', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('0c41efa9-2006-4d63-8497-5f3f4cc95eee', '2026-06-26T16:47:15.606858+00:00', 'Arelis del valle Rodríguez ', 72, 'Estatura baja, blanca , cabello amarillo teñido.', 'Los corales. La Guaira ', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/61dab62b-c334-46a3-9f05-700b6b22fa89.png', '04141852660', 'desaparecido', NULL, 'ba74e029-c34d-4103-9110-36513dfbc4d2', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('57421c13-e4ff-4c18-b1b0-632a58aeba10', '2026-06-26T16:52:11.521166+00:00', 'Yasmile Rafaela Utrera', 63, NULL, 'Edificio Costa Brava, Los Corales La Guaira', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/a537928e-b810-4bf5-b7a8-a9c87b8aec22.jpg', '+57 3205981963', 'desaparecido', 'Paula Tarazona', '91e0749d-b592-4f5e-bfad-09754d5ea7dd', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('5bb095ab-d6b6-4c7e-b7a0-fbf93eec201a', '2026-06-26T17:43:27.842952+00:00', 'Richard GUERRA', 50, 'Estatura media, delgado', 'los corales - avenida la costanera', 10.616501, -66.858029, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/7a3fc8ab-200c-47c1-a311-32c28fdad2ea.png', 'Robin Guerra 0033 611239233', 'desaparecido', 'Robin GUERRA 0033 611239233', 'f9cb9e5c-d4c0-4cc1-b5e3-a0de051f0b1b', 'masculino', '172 cm', 'media', NULL, 'problemas cardiacos', NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('bf005322-7090-4faf-a44b-38f0fa5923c6', '2026-06-26T18:05:41.277794+00:00', 'Kenji Gabriel Colón Torres ', 17, 'Cabello negro y ondulado, moreno, estatura promedio', NULL, 10.603385, -67.028429, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/b18c0a12-8a45-47cf-a12e-5ccecf4cb765.jpg', '+1 (248) 466-8295 / 3154050800', 'desaparecido', 'Maria José Martínez', '7749bd05-a6c2-4804-9c5e-01130eb74b95', 'masculino', '1.73', 'delgada', 'Piercings ', NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('aa9b6540-19c2-43dc-8a3a-dd92e3ab6acf', '2026-06-26T18:43:09.406283+00:00', 'Kleyber Daniel Montagut Navarro ', 25, NULL, 'Aeropuerto de Maiquetía, llegó en avión desde EEUU, se comunicó con sus familiares y luego del terremoto no se sabe nada sobre él ', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/81d318b6-c29f-422a-b07e-c63cbd54b29e.jpg', '+58 424-7267190 Daniela Montagut ', 'desaparecido', 'Daniela Montagut', '4911148f-c007-405e-b4ed-91007577dcab', 'masculino', NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('5c8557ee-ca4a-4bb7-91d0-7102b7f3a046', '2026-06-26T19:30:29.921179+00:00', 'Kiriaki Navarro Fleitas ', 37, 'Estatura media. Cabello liso/castaño.', 'Edificio Tahití - Caraballeda (La Guaira)', 10.618367, -66.849135, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/a3b562d4-09d1-4c47-952d-f545e9e24e2c.jpg', '04129640471 y 04121727364', 'desaparecido', 'Rebeca Fleitas (Mamá)', 'e3d7f42d-80ce-4a59-90ba-3efb91a4c61b', 'femenino', NULL, 'delgada', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('1455fe96-1c07-45be-8937-cac3ba3998ff', '2026-06-26T20:32:43.615817+00:00', 'Adrián Yanez ', 25, NULL, NULL, NULL, NULL, NULL, '04241551701', 'desaparecido', 'Andris Yanez', '0024385e-86bc-4285-b3ba-b20843ac085b', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('7a7e5486-96ca-4232-ac1d-0e4b3916a9d5', '2026-06-26T21:18:04.169197+00:00', 'Marysville Villafranca', 55, NULL, 'Res Villamar Playa Grande La Guaira', 10.608837, -67.015993, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/12463832-cf8b-4fdc-9e70-24f5ebde88ee.jpg', '(424) 2234667 / (412) 9548710', 'desaparecido', 'Mary Souto', 'fe95ed97-2579-44c3-8304-46222acdeccb', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('ce260c85-9eb5-4319-8461-47e4fb3f09d7', '2026-06-26T21:56:51.630203+00:00', 'Thaina Luna ', 45, NULL, 'Res. Auro la guaira ', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/96182aa6-d3be-46bf-8d52-b4fb44b7af52.jpg', '04123920851', 'desaparecido', 'Nathaly Kelsi', 'bf7cc42e-e483-430c-95ae-58d659295966', 'femenino', '1,60', 'delgada', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('72b6b750-cf9a-4e9c-aa39-fc202786b3ea', '2026-06-26T22:55:48.30244+00:00', 'Eukaris Torrealba / Gerolmy Guanipa', 19, NULL, 'Edificio costa brava / Los Corales ', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/509282d3-6918-4123-96cc-37da9902bf7a.jpg', '04125196632', 'desaparecido', NULL, 'd3fbab55-030d-4b10-9797-60e5d0573bbe', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('0ac8d6e6-fcc9-467d-8fd0-c1186c9c54fd', '2026-06-26T23:18:09.85911+00:00', 'Brayner Alex Delgado Chávez ', 8, 'Moreno, cabello oscuro', 'Edificio los delfines ', 10.600167, -66.929829, NULL, '+58 424-2283608', 'desaparecido', 'Reina Delgado', '9c3d5d4a-a781-494c-ad85-3477950009a8', 'masculino', '1,38', 'delgada', NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('b33a7447-39f3-47e7-805d-18cc15bdd6ce', '2026-06-26T23:40:01.317898+00:00', 'Valeria daza ', 19, 'Alta 1,68, Contextura delgada,Blanca ', 'Edificio auro apartamento 66 piso 6', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/6631dbeb-8649-41d3-b91d-453f2ab65503.jpg', '0424-9230018 (familiar)', 'desaparecido', 'Roxana Ruiz (0424-9230018 )', 'b6528c80-6d06-4270-86d9-7380b7a85f3a', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('78999b08-9762-4c1a-88c6-f67550140f6e', '2026-06-27T01:15:57.883168+00:00', 'Jose miguel tapia', 25, NULL, NULL, NULL, NULL, NULL, '0414-2563768', 'desaparecido', NULL, 'bfd46006-cb3c-4469-ab20-955da9159dc6', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('315d4a91-a867-4520-9fa0-29f692e06027', '2026-06-26T16:46:02.994895+00:00', 'Eliana palacios ', 40, 'Estatura baja, blanca, cabellos negro, largo y liso, de pecas, rellenita. ', 'Los corales. La Guaira ', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/29f14e1c-1559-45ac-8dac-7df7bf4ecdc8.png', '04141852660', 'encontrado', NULL, 'ba74e029-c34d-4103-9110-36513dfbc4d2', NULL, NULL, NULL, NULL, NULL, '2026-06-27T03:26:24.147+00:00', 'Fue localizada en san bernandino y ya está siendo atendida') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('95d4d554-7ad0-4c22-9fda-a698dadfaa2e', '2026-06-27T06:26:14.486666+00:00', 'thaina luna ', 45, 'lunar en el ojo', 'la guaira av la playa ', NULL, NULL, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/155e8d4c-27ac-4e1d-9173-cf7512c92dcb.png', '04165272323', 'desaparecido', 'dorys ibañez', '3b1c6a4d-afe3-488c-807e-f82b2b196df2', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('93923cb0-c8a8-499a-a7a1-c6a11ef175fb', '2026-06-27T14:06:28.560429+00:00', 'Rafael Alejandro Orellana Velasquez ', 21, 'Moreno, cabello negro, de estatura como de 1.79,ropa deportiva ', 'Catia la mar Caribe entrada los cocos edificio corales ', 10.600038, -66.929641, 'https://rhwelwvqmpiwicaryfbm.supabase.co/storage/v1/object/public/desaparecidos/dc358926-9636-414d-b36d-fbf919809bc7.jpg', 'Crismary Orellana 04245545992', 'desaparecido', 'Crismary Orellana', '302d30f6-119b-4aa2-b19d-fc3a14543e14', NULL, NULL, NULL, NULL, NULL, NULL, NULL) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas_desaparecidas (id, created_at, nombre, edad, descripcion, ultima_ubicacion, latitud, longitud, foto_url, contacto, estado, reportado_por_nombre, reporter_token, genero, estatura, contextura, senas_particulares, condicion_medica, encontrado_at, encontrado_nota) 
VALUES ('3fc564bc-df3d-4024-bf53-27c3508a5726', '2026-06-27T16:35:45.760862+00:00', 'Gabriel Austin ', 34, 'Cabello castaño, ojos caje, cara rellenita , usa lentes mide 1.75', 'Creemos que estaba en su departamento ', 10.615879, -66.844113, NULL, '04123321268', 'desaparecido', 'Gabriel Austin', 'd0249700-e353-49aa-9461-67eadbb82d2c', 'masculino', '1,75', 'robusta', 'Na ', 'Na ', NULL, NULL) 
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- Tabla public.desaparecidos_actualizaciones (1 registros)
-- ==========================================
INSERT INTO public.desaparecidos_actualizaciones (id, created_at, desaparecido_id, texto, autor_nombre, autor_contacto, latitud, longitud) 
VALUES ('e9a3faad-01d7-4ef8-920c-ae4d2f14f303', '2026-06-26T21:25:54.677437+00:00', '7a7e5486-96ca-4232-ac1d-0e4b3916a9d5', 'Edificio colapsado bajo escombros
Tambien Paola Bencomo y Leonardys Bencomo', 'Mary', '0412-2543058 WhatsApp', NULL, NULL) 
ON CONFLICT (id) DO NOTHING;


-- Tabla public.rescatados: Sin registros para importar

-- Tabla public.rescatados_publicos: Sin registros para importar

-- ==========================================
-- Tabla public.avisos (1 registros)
-- ==========================================
INSERT INTO public.avisos (id, created_at, categoria, titulo, descripcion, contacto, imagen_url, fuente, reporter_token, verificado, reportes, oculto) 
VALUES ('f147e504-3d0b-47bd-b470-01f2025cf752', '2026-06-25T17:26:52.479739+00:00', 'mascotas', 'ENCONTRAMOS A TUS MASCOTAS', NULL, NULL, NULL, NULL, '4fc1a9f8-0d5c-40df-86b9-890b4e92d69f', false, 2, false) 
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- Tabla public.traslados (5 registros)
-- ==========================================
INSERT INTO public.traslados (id, created_at, tipo, descripcion, cantidad, origen_ref, origen_lat, origen_lng, destino_ref, destino_lat, destino_lng, prioridad, contacto, cuando, estado, operador, reporter_token) 
VALUES ('b12e9a39-a4c6-4d60-bc4c-3c935779f6d3', '2026-06-26T00:45:35.661658+00:00', 'alimentos', 'tenemos la parte del junquito está sumamente afectada no está subiendo ayuda para allá trata de correr la voz se necesita más choferes más motorizado más carros más que todo motorizado que estén activos para subir para los quitos los kilómetros más afectados estamos en la sede de la agencia central central y ahí están saliendo hay comida y todo agua pero se necesitan choferes motorizados que suban hasta el kilómetro 11 que para allá no está llegando ayuda', '100kg', 'Centro de Acopio', 10.495914, -66.879263, 'Kilometro 11', 10.460903, -67.078943, 'alta', '04126111969', 'Lo antes posible', 'completado', NULL, 'a1a7866a-5430-4b49-86a6-0d9534821f57') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.traslados (id, created_at, tipo, descripcion, cantidad, origen_ref, origen_lat, origen_lng, destino_ref, destino_lat, destino_lng, prioridad, contacto, cuando, estado, operador, reporter_token) 
VALUES ('400eafb2-87f2-4c24-8962-c34fef57e0c5', '2026-06-26T14:34:02.854336+00:00', 'personal_medico', 'Voluntarios ', '30 personas ', 'Edificio las aves ', 10.478043, -66.834801, 'Frente a club playa grande ', 10.621868, -66.718576, 'alta', '0412-6766708', '2pm', 'en_camino', '{"nombre":"Ac Propatria, 23 de Enero . Sioencia","cedula":"V-21623015","telefono":"04242948774","modelo":"Minibus","placa":"04AA3JW","unidad":"22","puestos":"22","ciudad":"Caracas","linea":"Ac Propatria, 23 de Enero . Silencio","estado":"Dtto capital"}', 'e8c51ef3-eec2-462a-8e2a-2c2ff3c3c2cc') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.traslados (id, created_at, tipo, descripcion, cantidad, origen_ref, origen_lat, origen_lng, destino_ref, destino_lat, destino_lng, prioridad, contacto, cuando, estado, operador, reporter_token) 
VALUES ('0e9ed93b-528d-4603-ae41-10cd22da3061', '2026-06-26T02:20:40.276187+00:00', 'personal_medico', '40 rescatistas y 8 perros rastreadores (personal nacional y extranjero). Adicionalmente insumos medicos y material de rescate', '40+8', 'Casa de muro blanco con banderines de ROTARAC enfrente', 10.445829, -66.870695, 'Zona de desastres, punto de llegada a determinar una vez en el sitio', 10.600038, -66.929641, 'alta', '04241782827 - 04244687763', '26/06/2026 2:00pm', 'en_camino', '{"nombre":"Cooperativa Santa Lucia ","cedula":"27622278","telefono":"0416-0395986","modelo":"Encava","placa":"31AF03P","unidad":"21","puestos":"43","ciudad":"Caracas","linea":"Santa Lucia ","estado":"Miranda"}', '1c52314f-3ce0-42bc-b609-7233d7708ce1') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.traslados (id, created_at, tipo, descripcion, cantidad, origen_ref, origen_lat, origen_lng, destino_ref, destino_lat, destino_lng, prioridad, contacto, cuando, estado, operador, reporter_token) 
VALUES ('e70e7326-77c7-476f-bd3a-664bdf9d4bb5', '2026-06-27T01:01:53.453298+00:00', 'personal_medico', NULL, NULL, 'Edo Zulia, cabimas ', 10.426311, -71.46119, 'La guaira ', 10.598701, -66.929669, 'alta', '04247271071 ', 'Lo antes posible', 'solicitado', NULL, '4a9875b9-2510-4c68-9a9a-810486290612') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.traslados (id, created_at, tipo, descripcion, cantidad, origen_ref, origen_lat, origen_lng, destino_ref, destino_lat, destino_lng, prioridad, contacto, cuando, estado, operador, reporter_token) 
VALUES ('49fc3a5b-e2ca-45ba-a208-facf7e6f7c4e', '2026-06-26T18:24:12.399064+00:00', 'personal_medico', 'Personal medico', '60 personas', 'Terminal de pasajeros', 10.243313, -67.591489, 'El junguito', 10.463314, -67.052626, 'alta', '0424-3061777 ', 'Lo antes posible', 'solicitado', NULL, '1037d601-cb8c-4834-89f6-0b0d912b80c7') 
ON CONFLICT (id) DO NOTHING;


