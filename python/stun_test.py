import stun
import socket

def obtener_ip_puerto_externos():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('', 0))

    source_ip, source_port = s.getsockname()

    nat_type, data = stun.get_nat_type(s, source_ip, source_port,
                                      stun_host='stun.l.google.com',
                                      stun_port=19302)

    print(f"NAT Type: {nat_type}")

    if data.get('Resp'):
        external_ip = data.get('ExternalIP')
        external_port = data.get('ExternalPort')
        print(f"IP pública: {external_ip}")
        print(f"Puerto público: {external_port}")
    else:
        print("No se pudo determinar la IP y puerto externos.")

if __name__ == "__main__":
    obtener_ip_puerto_externos()
