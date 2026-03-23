"""
Cliente HTTP para a API do SICCR2.
Usa X-Api-Key para autenticação (gerada no painel admin → API Keys).
"""

import requests


class SICCRClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "X-Api-Key": api_key,
            "Content-Type": "application/json",
        })

    def testar_conexao(self) -> bool:
        """Verifica se a API está acessível e a chave é válida."""
        try:
            r = self.session.get(f"{self.base_url}/rpa/pedidos", timeout=5)
            return r.status_code == 200
        except requests.RequestException:
            return False

    def listar_pedidos_pendentes(self) -> list[dict]:
        """Retorna todos os pedidos pendentes (rota exclusiva RPA)."""
        r = self.session.get(f"{self.base_url}/rpa/pedidos", timeout=10)
        r.raise_for_status()
        return r.json().get("data", [])

    def listar_itens(self, pedido_id: int) -> list[dict]:
        """Retorna os itens de um pedido específico."""
        r = self.session.get(
            f"{self.base_url}/rpa/pedidos/{pedido_id}/itens", timeout=10
        )
        r.raise_for_status()
        return r.json().get("data", [])

    def marcar_atendido(self, pedido_id: int) -> dict:
        """Marca o pedido como atendido na plataforma."""
        r = self.session.patch(
            f"{self.base_url}/rpa/pedidos/{pedido_id}/atender",
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
