-- Script para limpiar refresh tokens expirados (ejecutar periódicamente)

DELETE FROM refresh_tokens 
WHERE expira_en < NOW() 
OR revocado_en IS NOT NULL AND revocado_en < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Mantener solo los últimos 5 refresh tokens activos por usuario
DELETE rt1 FROM refresh_tokens rt1
INNER JOIN (
    SELECT usuario_id, token
    FROM (
        SELECT 
            usuario_id,
            token,
            ROW_NUMBER() OVER (PARTITION BY usuario_id ORDER BY creado_en DESC) as rn
        FROM refresh_tokens
        WHERE revocado_en IS NULL
    ) ranked
    WHERE rn > 5
) rt2 ON rt1.usuario_id = rt2.usuario_id AND rt1.token = rt2.token;
