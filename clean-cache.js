/**
 * Script para limpiar duplicados y cachés corruptos
 * Ejecutar si hay problemas con emprendimientos duplicados o undefined
 * 
 * Uso: node clean-cache.js
 */

const redis = require('redis');

async function cleanCache() {
    console.log('🧹 Iniciando limpieza de caché...\n');

    const client = redis.createClient({
        socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379
        },
        database: parseInt(process.env.REDIS_DB) || 0
    });

    try {
        await client.connect();
        console.log('✅ Conectado a Redis\n');

        // 1. Limpiar lista de emprendimientos administrativos
        console.log('🔍 Verificando lista admin:all-businesses...');
        const adminList = await client.get('admin:all-businesses');
        
        if (adminList) {
            const businesses = JSON.parse(adminList);
            console.log(`   Encontrados ${businesses.length} emprendimientos`);
            
            // Identificar duplicados
            const uniqueBusinesses = [];
            const seenIds = new Set();
            const seenUserIds = new Set();
            
            for (const business of businesses) {
                const isDuplicate = 
                    seenIds.has(business.id) || 
                    (business._isPending && seenUserIds.has(business.userId));
                
                if (!isDuplicate && business.id && business.name) {
                    uniqueBusinesses.push(business);
                    seenIds.add(business.id);
                    if (business.userId) {
                        seenUserIds.add(business.userId);
                    }
                } else {
                    console.log(`   ⚠️  Eliminando duplicado/corrupto: ${business.id} - ${business.name || 'undefined'}`);
                }
            }
            
            console.log(`   ✅ ${uniqueBusinesses.length} emprendimientos únicos`);
            console.log(`   🗑️  ${businesses.length - uniqueBusinesses.length} duplicados eliminados\n`);
            
            // Guardar lista limpia
            await client.set('admin:all-businesses', JSON.stringify(uniqueBusinesses));
            await client.expire('admin:all-businesses', 300); // 5 minutos
        } else {
            console.log('   ℹ️  No hay lista de emprendimientos en caché\n');
        }

        // 2. Limpiar cachés de emprendimientos temporales obsoletos
        console.log('🔍 Buscando cachés temporales obsoletos...');
        const tempPattern = 'admin:business:businessId:temp_*';
        const tempKeys = await client.keys(tempPattern);
        
        if (tempKeys.length > 0) {
            console.log(`   Encontrados ${tempKeys.length} cachés temporales`);
            for (const key of tempKeys) {
                await client.del(key);
            }
            console.log(`   🗑️  ${tempKeys.length} cachés temporales eliminados\n`);
        } else {
            console.log('   ✅ No hay cachés temporales obsoletos\n');
        }

        // 3. Limpiar estadísticas para forzar recálculo
        console.log('🔄 Invalidando estadísticas...');
        await client.del('admin:statistics');
        console.log('   ✅ Estadísticas invalidadas\n');

        // 4. Mostrar resumen
        console.log('📊 Resumen de cachés actuales:');
        const allKeys = await client.keys('*');
        const keysByType = {
            'admin:': 0,
            'characterization:': 0,
            'dashboard:': 0,
            'otros': 0
        };
        
        for (const key of allKeys) {
            if (key.startsWith('admin:')) keysByType['admin:']++;
            else if (key.startsWith('characterization:')) keysByType['characterization:']++;
            else if (key.startsWith('dashboard:')) keysByType['dashboard:']++;
            else keysByType['otros']++;
        }
        
        console.log(`   - Cachés admin: ${keysByType['admin:']}`);
        console.log(`   - Cachés characterization: ${keysByType['characterization:']}`);
        console.log(`   - Cachés dashboard: ${keysByType['dashboard:']}`);
        console.log(`   - Otros: ${keysByType['otros']}`);
        console.log(`   - Total: ${allKeys.length}\n`);

        // Mostrar muestra de emprendimientos en caché
        const adminListKey = 'admin:all-businesses';
        const adminListFinal = await client.get(adminListKey);
        if (adminListFinal) {
            const businesses = JSON.parse(adminListFinal);
            console.log('📋 Muestra de emprendimientos en caché:');
            businesses.slice(0, 3).forEach(b => {
                const pending = b._isPending ? ' ⏳ PENDIENTE' : ' ✅';
                const userName = b.User ? `${b.User.firstName} ${b.User.lastName}` : 'N/A';
                console.log(`   - #${b.id}${pending}: ${b.name || 'undefined'} (${userName})`);
            });
            console.log();
        }

        console.log('✅ Limpieza completada exitosamente\n');

    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        process.exit(1);
    } finally {
        await client.quit();
    }
}

// Ejecutar
cleanCache().catch(console.error);
