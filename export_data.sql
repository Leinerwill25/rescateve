SELECT 
  (SELECT json_agg(row_to_json(solicitudes_ayuda)) FROM solicitudes_ayuda) AS solicitudes_ayuda,
  (SELECT json_agg(row_to_json(personas_desaparecidas)) FROM personas_desaparecidas) AS personas_desaparecidas,
  (SELECT json_agg(row_to_json(desaparecidos_actualizaciones)) FROM desaparecidos_actualizaciones) AS desaparecidos_actualizaciones,
  (SELECT json_agg(row_to_json(rescatados)) FROM rescatados) AS rescatados,
  (SELECT json_agg(row_to_json(rescatados_publicos)) FROM rescatados_publicos) AS rescatados_publicos,
  (SELECT json_agg(row_to_json(avisos)) FROM avisos) AS avisos,
  (SELECT json_agg(row_to_json(traslados)) FROM traslados) AS traslados,
  (SELECT json_agg(row_to_json(pacientes_hospitales)) FROM pacientes_hospitales) AS pacientes_hospitales;
