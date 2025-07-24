# netTools
- proyecto para desglosar y comprender por dentro las herramientas de red
UDP
TCP
MQTT

hyperswarm
    |-b4a
    |-bare-events
    |-safety-catch
    |-hyperdht
        |-@hyperswarm/secret-stream
        |-b4a
        |-bare-events
        |-blind-relay
        |-bogon
        |-compact
        |-encodingcompact-encoding-net
        |-dht-rpc
        |-hypercore-crypto
        |-hypercore-id-encoding
        |-noise-curve-ed
        |-noise-handshake
        |-record-cache
        |-safety-catch
        |-signal-promise
        |-sodium-universal
        |-streamx
        |-unslab
        |-xache

    |-shuffled-priority-queue
        |-unordered-set

    |-unslab
        |-b4a




[ Tu App P2P (ej: chat, carpeta compartida, etc.) ]
                  ↓
[ Hyperswarm ] - "Me uno a una sala (topic hash)"
                  ↓
[ HyperDHT ] - Crea conexiones P2P seguras (NOISE), hace hole punching si hace falta
                  ↓
[ dht-rpc ] - Implementa el ruteo Kademlia, mantiene la red distribuida
                  ↓
[ k-bucket ] - Administra la tabla de nodos más cercanos (por XOR distance)
                  ↓
[ UDP Socket (dgram) ] - Envía/recibe paquetes binarios a través de la red
                  ↓
[ Sistema operativo ] - Maneja red física, NAT, puertos, sockets
