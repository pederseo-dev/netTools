from typing import List, Optional

class RoutingTable:
    def __init__(self, node_id: bytes, k: int = 20):
        """
        Versión SIMPLE sin eventos - el algoritmo funciona igual
        """
        self.id = node_id
        self.k = k
        self.size = 0
        self.rows = [None] * (len(node_id) * 8)
    
    def add(self, node) -> bool:
        """Agrega un nodo - SIN eventos"""
        i = self._diff(node.id)
        row = self.rows[i]
        
        if not row:
            row = self.rows[i] = Row(self, i)
            # ❌ Sin emitir evento
        
        len_before = len(row.nodes)
        if not row.add(node, self.k):
            return False
        
        self.size += len(row.nodes) - len_before
        return True
    
    def remove(self, node_id: bytes) -> bool:
        """Elimina un nodo - SIN eventos"""
        i = self._diff(node_id)
        row = self.rows[i]
        if not row:
            return False
        if not row.remove(node_id):
            return False
        self.size -= 1
        return True
    
    def get(self, node_id: bytes):
        """Obtiene un nodo - SIN eventos"""
        i = self._diff(node_id)
        row = self.rows[i]
        if not row:
            return None
        return row.get(node_id)
    
    def has(self, node_id: bytes) -> bool:
        return self.get(node_id) is not None
    
    def closest(self, node_id: bytes, k: Optional[int] = None) -> List:
        """Obtiene nodos cercanos - SIN eventos"""
        if k is None:
            k = self.k
        
        result = []
        d = self._diff(node_id)
        
        for i in range(d, -1, -1):
            if len(result) >= k:
                break
            self._push_nodes(i, k, result)
        
        for i in range(d + 1, len(self.rows)):
            if len(result) >= k:
                break
            self._push_nodes(i, k, result)
        
        return result
    
    def _push_nodes(self, i: int, k: int, result: List):
        row = self.rows[i]
        if not row:
            return
        
        missing = min(k - len(result), len(row.nodes))
        for j in range(missing):
            result.append(row.nodes[j])
    
    def to_array(self) -> List:
        return self.closest(self.id, float('inf'))
    
    def _diff(self, node_id: bytes) -> int:
        for i in range(len(node_id)):
            a = node_id[i]
            b = self.id[i]
            
            if a != b:
                xor = a ^ b
                bit_pos = 7
                while bit_pos >= 0 and (xor & (1 << bit_pos)) == 0:
                    bit_pos -= 1
                return i * 8 + (7 - bit_pos)
        
        return len(self.rows) - 1


class Row:
    def __init__(self, table: RoutingTable, index: int):
        """Bucket simple - SIN eventos"""
        self.data = None
        self.byte_offset = index >> 3
        self.index = index
        self.table = table
        self.nodes = []
    
    def add(self, node, k: int) -> bool:
        """Agrega nodo - SIN eventos"""
        node_id = node.id
        
        l, r = 0, len(self.nodes) - 1
        
        while l <= r:
            m = (l + r) >> 1
            c = self.compare(node_id, self.nodes[m].id)
            
            if c == 0:
                self.nodes[m] = node
                return True
            
            if c < 0:
                r = m - 1
            else:
                l = m + 1
        
        if len(self.nodes) >= k:
            # ❌ Sin emitir evento 'full'
            return False
        
        self.insert(l, node)
        return True
    
    def remove(self, node_id: bytes) -> bool:
        """Elimina nodo - SIN eventos"""
        l, r = 0, len(self.nodes) - 1
        
        while l <= r:
            m = (l + r) >> 1
            c = self.compare(node_id, self.nodes[m].id)
            
            if c == 0:
                self.splice(m)
                return True
            
            if c < 0:
                r = m - 1
            else:
                l = m + 1
        
        return False
    
    def get(self, node_id: bytes):
        """Obtiene nodo - SIN eventos"""
        l, r = 0, len(self.nodes) - 1
        
        while l <= r:
            m = (l + r) >> 1
            node = self.nodes[m]
            c = self.compare(node_id, node.id)
            
            if c == 0:
                return node
            if c < 0:
                r = m - 1
            else:
                l = m + 1
        
        return None
    
    def insert(self, i: int, node):
        """Inserta nodo - SIN eventos"""
        self.nodes.append(node)
        for j in range(len(self.nodes) - 1, i, -1):
            self.nodes[j] = self.nodes[j - 1]
        self.nodes[i] = node
        # ❌ Sin emitir evento 'add'
    
    def splice(self, i: int):
        """Elimina nodo - SIN eventos"""
        removed_node = self.nodes[i]
        for j in range(i, len(self.nodes) - 1):
            self.nodes[j] = self.nodes[j + 1]
        self.nodes.pop()
        # ❌ Sin emitir evento 'remove'
    
    def compare(self, a: bytes, b: bytes) -> int:
        for i in range(self.byte_offset, len(a)):
            ai = a[i]
            bi = b[i]
            if ai == bi:
                continue
            return -1 if ai < bi else 1
        return 0


# Ejemplo de uso SIN eventos
if __name__ == "__main__":
    import random
    
    def random_id(length: int = 32) -> bytes:
        return bytes(random.getrandbits(8) for _ in range(length))
    
    # Crear tabla SIN eventos
    local_id = random_id()
    table = RoutingTable(local_id, k=20)
    
    print(f"Tabla creada con ID local: {local_id.hex()}")
    
    # Agregar nodos - SIN notificaciones
    for i in range(5):
        node_id = random_id()
        node = type('Node', (), {'id': node_id})()
        
        if table.add(node):
            print(f"✅ Nodo {i+1} agregado: {node_id.hex()}")
        else:
            print(f"❌ Nodo {i+1} rechazado: {node_id.hex()}")
    
    print(f"\nTotal de nodos: {table.size}")
    print(f"Nodos en tabla: {[node.id.hex() for node in table.to_array()]}")
    
    # Buscar nodos cercanos - SIN eventos
    target_id = random_id()
    closest = table.closest(target_id, k=3)
    print(f"\nNodos más cercanos a {target_id.hex()}:")
    for node in closest:
        print(f"  - {node.id.hex()}") 