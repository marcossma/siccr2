-- Schema dump gerado automaticamente. NÃO editar manualmente.
-- Origem: docker compose db (siccr) — 2026-09-03T19:18:04.295Z
-- Regenere com: npm run db:dump

--
-- PostgreSQL database dump
--

\restrict Kle7SFOJ04fa7iZacdjlHEBK6HFrcT46rWhWrsqlvsi5uCm2eIbB3eno6KgNuRB

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


--
-- Name: admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin (
    admin_id integer NOT NULL,
    admin_user character varying(255) NOT NULL,
    senha character varying(255) NOT NULL,
    nome character varying(255),
    email character varying(255) NOT NULL,
    telefone character varying(255)
);


--
-- Name: admin_admin_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_admin_id_seq OWNED BY public.admin.admin_id;


--
-- Name: agendamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agendamentos (
    id_agendamento integer NOT NULL,
    sala_id integer NOT NULL,
    solicitante_user_id integer NOT NULL,
    motivo text NOT NULL,
    observacao text,
    dia_inteiro boolean DEFAULT false NOT NULL,
    hora_inicio time without time zone,
    hora_fim time without time zone,
    data_inicio date NOT NULL,
    data_fim_recorrencia date,
    tipo_recorrencia character varying(20) DEFAULT 'pontual'::character varying NOT NULL,
    dias_semana character varying(20),
    intervalo_semanas integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    aprovado_por_user_id integer,
    data_decisao timestamp with time zone,
    motivo_rejeicao text,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origem character varying(20) DEFAULT 'solicitacao'::character varying NOT NULL,
    turma_horario_id integer
);


--
-- Name: agendamentos_id_agendamento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agendamentos_id_agendamento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agendamentos_id_agendamento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agendamentos_id_agendamento_seq OWNED BY public.agendamentos.id_agendamento;


--
-- Name: agendamentos_ocorrencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agendamentos_ocorrencias (
    id_ocorrencia integer NOT NULL,
    agendamento_id integer NOT NULL,
    data_ocorrencia date NOT NULL,
    status_individual character varying(30) DEFAULT 'ativa'::character varying NOT NULL,
    motivo_individual text
);


--
-- Name: agendamentos_ocorrencias_id_ocorrencia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agendamentos_ocorrencias_id_ocorrencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agendamentos_ocorrencias_id_ocorrencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agendamentos_ocorrencias_id_ocorrencia_seq OWNED BY public.agendamentos_ocorrencias.id_ocorrencia;


--
-- Name: almoxarifado_requisicoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.almoxarifado_requisicoes (
    id_requisicao integer NOT NULL,
    ano integer NOT NULL,
    data_lancamento date,
    num_requisicao character varying(30),
    tipo_movimento character varying(60),
    subunidade_id integer,
    subunidade_texto character varying(255),
    solicitante character varying(255),
    usuario_sie character varying(255),
    valor_total numeric(14,2),
    local_entrega character varying(255),
    situacao character varying(120),
    observacao text,
    tramitacao character varying(120),
    origem_aba character varying(80) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origem character varying(10) DEFAULT 'importado'::character varying NOT NULL,
    created_by_user_id integer
);


--
-- Name: almoxarifado_requisicoes_id_requisicao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.almoxarifado_requisicoes_id_requisicao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: almoxarifado_requisicoes_id_requisicao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.almoxarifado_requisicoes_id_requisicao_seq OWNED BY public.almoxarifado_requisicoes.id_requisicao;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    subunidade_id integer NOT NULL,
    api_key character varying(80) NOT NULL,
    descricao character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone
);


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: assistente_conversas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assistente_conversas (
    id_conversa integer NOT NULL,
    user_id integer NOT NULL,
    titulo character varying(120),
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assistente_conversas_id_conversa_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assistente_conversas_id_conversa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assistente_conversas_id_conversa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assistente_conversas_id_conversa_seq OWNED BY public.assistente_conversas.id_conversa;


--
-- Name: assistente_mensagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assistente_mensagens (
    id_mensagem integer NOT NULL,
    conversa_id integer NOT NULL,
    papel character varying(12) NOT NULL,
    conteudo text,
    ferramentas jsonb,
    tokens_entrada integer,
    tokens_saida integer,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assistente_mensagens_id_mensagem_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assistente_mensagens_id_mensagem_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assistente_mensagens_id_mensagem_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assistente_mensagens_id_mensagem_seq OWNED BY public.assistente_mensagens.id_mensagem;


--
-- Name: bens_permanentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bens_permanentes (
    id_bem integer NOT NULL,
    numero_registro character varying(60) NOT NULL,
    descricao character varying(255) NOT NULL,
    sala_id integer,
    subunidade_id integer,
    estado_conservacao character varying(20),
    observacao character varying(255),
    data_levantamento date,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id integer
);


--
-- Name: bens_permanentes_id_bem_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bens_permanentes_id_bem_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bens_permanentes_id_bem_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bens_permanentes_id_bem_seq OWNED BY public.bens_permanentes.id_bem;


--
-- Name: comunicados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comunicados (
    id_comunicado integer NOT NULL,
    assunto character varying(255) NOT NULL,
    corpo text NOT NULL,
    criterio character varying(500),
    total_destinatarios integer DEFAULT 0 NOT NULL,
    enviados integer DEFAULT 0 NOT NULL,
    falhas integer DEFAULT 0 NOT NULL,
    enviado_por_user_id integer,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: comunicados_id_comunicado_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comunicados_id_comunicado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comunicados_id_comunicado_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comunicados_id_comunicado_seq OWNED BY public.comunicados.id_comunicado;


--
-- Name: configuracoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes (
    chave character varying(80) NOT NULL,
    valor text,
    updatedat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cursos (
    id_curso integer NOT NULL,
    cod_curso character varying(20) NOT NULL,
    nome character varying(255) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    nivel character varying(20) DEFAULT 'graduacao'::character varying NOT NULL
);


--
-- Name: cursos_id_curso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cursos_id_curso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cursos_id_curso_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cursos_id_curso_seq OWNED BY public.cursos.id_curso;


--
-- Name: despesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.despesas (
    id_despesa integer NOT NULL,
    id_subunidade integer,
    id_tipo_despesa integer,
    valor_despesa numeric(10,2),
    data_despesa timestamp with time zone,
    numero_documento_despesa character varying(50),
    observacao_despesa character varying(255)
);


--
-- Name: despesas_id_despesa_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.despesas_id_despesa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: despesas_id_despesa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.despesas_id_despesa_seq OWNED BY public.despesas.id_despesa;


--
-- Name: disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinas (
    id_disciplina integer NOT NULL,
    codigo character varying(30),
    nome character varying(255) NOT NULL,
    carga_horaria integer,
    subunidade_id integer,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: disciplinas_id_disciplina_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disciplinas_id_disciplina_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disciplinas_id_disciplina_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disciplinas_id_disciplina_seq OWNED BY public.disciplinas.id_disciplina;


--
-- Name: empenhos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empenhos (
    id_empenho integer NOT NULL,
    ano integer NOT NULL,
    data_cadastro date,
    num_sie character varying(30),
    num_siafi character varying(30),
    especie character varying(30),
    cod_natureza character varying(20),
    tipo_despesa character varying(120),
    estimativo boolean DEFAULT false NOT NULL,
    fornecedor character varying(255),
    subunidade_pagadora_id integer,
    subunidade_pagadora_texto character varying(255),
    subunidade_entrega_id integer,
    subunidade_entrega_texto character varying(255),
    resumo text,
    valor_empenhado numeric(14,2),
    valor_liquidado numeric(14,2),
    processo character varying(255),
    observacao text,
    origem_aba character varying(80) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origem character varying(10) DEFAULT 'importado'::character varying NOT NULL,
    created_by_user_id integer
);


--
-- Name: empenhos_id_empenho_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empenhos_id_empenho_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empenhos_id_empenho_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empenhos_id_empenho_seq OWNED BY public.empenhos.id_empenho;


--
-- Name: funcionalidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funcionalidades (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    descricao character varying(255),
    modulo character varying(50) NOT NULL,
    subunidade_responsavel_id integer
);


--
-- Name: funcionalidades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.funcionalidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: funcionalidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.funcionalidades_id_seq OWNED BY public.funcionalidades.id;


--
-- Name: importacoes_financeiro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.importacoes_financeiro (
    id_importacao integer NOT NULL,
    origem_aba character varying(80) NOT NULL,
    tipo character varying(30) NOT NULL,
    ano integer,
    linhas_gravadas integer DEFAULT 0 NOT NULL,
    linhas_ignoradas integer DEFAULT 0 NOT NULL,
    user_id integer,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: importacoes_financeiro_id_importacao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.importacoes_financeiro_id_importacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: importacoes_financeiro_id_importacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.importacoes_financeiro_id_importacao_seq OWNED BY public.importacoes_financeiro.id_importacao;


--
-- Name: itens_pedido_almoxarifado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_pedido_almoxarifado (
    id_item integer NOT NULL,
    pedido_id integer NOT NULL,
    codigo_produto character varying(50),
    descricao_produto text NOT NULL,
    quantidade integer DEFAULT 1 NOT NULL
);


--
-- Name: itens_pedido_almoxarifado_id_item_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.itens_pedido_almoxarifado_id_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itens_pedido_almoxarifado_id_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.itens_pedido_almoxarifado_id_item_seq OWNED BY public.itens_pedido_almoxarifado.id_item;


--
-- Name: licitacoes_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licitacoes_itens (
    id_item integer NOT NULL,
    ano integer NOT NULL,
    data date,
    tipo character varying(120),
    subunidade_id integer,
    subunidade_texto character varying(255),
    interessado character varying(255),
    elaborador_etp character varying(255),
    usuario_sie character varying(255),
    cod_reduzido character varying(40),
    descricao text,
    unidades numeric(12,3),
    valor_unitario numeric(14,2),
    valor_total numeric(14,2),
    dfd character varying(40),
    etp character varying(40),
    solicitacao_sie character varying(40),
    origem_aba character varying(80) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origem character varying(10) DEFAULT 'importado'::character varying NOT NULL,
    created_by_user_id integer
);


--
-- Name: licitacoes_itens_id_item_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.licitacoes_itens_id_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: licitacoes_itens_id_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.licitacoes_itens_id_item_seq OWNED BY public.licitacoes_itens.id_item;


--
-- Name: manutencao_tipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manutencao_tipos (
    id_tipo integer NOT NULL,
    nome character varying(120) NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: manutencao_tipos_id_tipo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manutencao_tipos_id_tipo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manutencao_tipos_id_tipo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manutencao_tipos_id_tipo_seq OWNED BY public.manutencao_tipos.id_tipo;


--
-- Name: manutencoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manutencoes (
    id_manutencao integer NOT NULL,
    sala_id integer,
    tipo_id integer,
    descricao text NOT NULL,
    prioridade character varying(10) DEFAULT 'media'::character varying NOT NULL,
    status character varying(15) DEFAULT 'aberta'::character varying NOT NULL,
    created_by_user_id integer,
    resolucao text,
    data_conclusao timestamp with time zone,
    concluido_por_user_id integer,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedat timestamp with time zone
);


--
-- Name: manutencoes_id_manutencao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manutencoes_id_manutencao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manutencoes_id_manutencao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manutencoes_id_manutencao_seq OWNED BY public.manutencoes.id_manutencao;


--
-- Name: naturezas_despesa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.naturezas_despesa (
    id_natureza integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nome character varying(120) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: naturezas_despesa_id_natureza_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.naturezas_despesa_id_natureza_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: naturezas_despesa_id_natureza_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.naturezas_despesa_id_natureza_seq OWNED BY public.naturezas_despesa.id_natureza;


--
-- Name: orcamento_dotacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orcamento_dotacoes (
    id_dotacao integer NOT NULL,
    ano integer NOT NULL,
    categoria character varying(10) DEFAULT 'custeio'::character varying NOT NULL,
    grupo character varying(255),
    programa character varying(255) NOT NULL,
    percentual numeric(8,4),
    valor numeric(14,2),
    subunidade_id integer,
    subunidade_texto character varying(255),
    origem_aba character varying(80) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origem character varying(10) DEFAULT 'importado'::character varying NOT NULL,
    created_by_user_id integer
);


--
-- Name: orcamento_dotacoes_id_dotacao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orcamento_dotacoes_id_dotacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orcamento_dotacoes_id_dotacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orcamento_dotacoes_id_dotacao_seq OWNED BY public.orcamento_dotacoes.id_dotacao;


--
-- Name: patrimonio_historico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patrimonio_historico (
    id_historico integer NOT NULL,
    bem_id integer,
    numero_registro character varying(60),
    acao character varying(20) NOT NULL,
    user_id integer,
    sala_id integer,
    sala_anterior_id integer,
    detalhe character varying(500),
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: patrimonio_historico_id_historico_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patrimonio_historico_id_historico_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patrimonio_historico_id_historico_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patrimonio_historico_id_historico_seq OWNED BY public.patrimonio_historico.id_historico;


--
-- Name: pedidos_almoxarifado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos_almoxarifado (
    id_pedido integer NOT NULL,
    subunidade_id integer NOT NULL,
    data_pedido date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    observacao text,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_conclusao timestamp with time zone
);


--
-- Name: pedidos_almoxarifado_id_pedido_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pedidos_almoxarifado_id_pedido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos_almoxarifado_id_pedido_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedidos_almoxarifado_id_pedido_seq OWNED BY public.pedidos_almoxarifado.id_pedido;


--
-- Name: periodos_letivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodos_letivos (
    id_periodo integer NOT NULL,
    nome character varying(20) NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    ativo boolean DEFAULT false NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: periodos_letivos_id_periodo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.periodos_letivos_id_periodo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: periodos_letivos_id_periodo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.periodos_letivos_id_periodo_seq OWNED BY public.periodos_letivos.id_periodo;


--
-- Name: permissoes_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissoes_usuario (
    id integer NOT NULL,
    user_id integer NOT NULL,
    funcionalidade_id integer NOT NULL,
    concedido_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: permissoes_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissoes_usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissoes_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissoes_usuario_id_seq OWNED BY public.permissoes_usuario.id;


--
-- Name: predios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predios (
    predio_id integer NOT NULL,
    predio character varying(255),
    descricao character varying(255),
    createdat timestamp with time zone,
    updatedat timestamp with time zone,
    updatedforuser character varying(255),
    unidade_id integer
);


--
-- Name: predios_predio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.predios_predio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: predios_predio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.predios_predio_id_seq OWNED BY public.predios.predio_id;


--
-- Name: previsoes_despesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.previsoes_despesas (
    id_previsao integer NOT NULL,
    subunidade_id integer NOT NULL,
    id_tipo_despesa integer NOT NULL,
    valor_previsto numeric(12,2) NOT NULL,
    ano_referencia integer NOT NULL,
    observacao text,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: previsoes_despesas_id_previsao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.previsoes_despesas_id_previsao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: previsoes_despesas_id_previsao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.previsoes_despesas_id_previsao_seq OWNED BY public.previsoes_despesas.id_previsao;


--
-- Name: professores_disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.professores_disciplinas (
    id integer NOT NULL,
    user_id integer NOT NULL,
    disciplina_id integer NOT NULL
);


--
-- Name: professores_disciplinas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.professores_disciplinas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: professores_disciplinas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.professores_disciplinas_id_seq OWNED BY public.professores_disciplinas.id;


--
-- Name: recursos_recebidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recursos_recebidos (
    id_recurso_recebido integer NOT NULL,
    tipo_recurso_recebido integer,
    valor_recurso_recebido numeric(10,2),
    descricao_recurso_recebido character varying(255),
    data_recebimento date DEFAULT CURRENT_DATE
);


--
-- Name: recursos_recebidos_id_recurso_recebido_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recursos_recebidos_id_recurso_recebido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recursos_recebidos_id_recurso_recebido_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recursos_recebidos_id_recurso_recebido_seq OWNED BY public.recursos_recebidos.id_recurso_recebido;


--
-- Name: salas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salas (
    sala_id integer NOT NULL,
    sala_nome character varying(255),
    predio_id integer,
    subunidade_id integer,
    is_agendavel integer DEFAULT 0,
    sala_descricao character varying(255),
    sala_tipo_id integer,
    sala_capacidade integer,
    presta_servicos_externos integer,
    sala_largura numeric(6,2),
    sala_comprimento numeric(6,2),
    sala_altura numeric(6,2),
    created_by_user_id integer,
    agendamento_manual integer DEFAULT 0
);


--
-- Name: salas_historico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salas_historico (
    id_historico integer NOT NULL,
    sala_id integer,
    sala_nome character varying(255),
    acao character varying(20) NOT NULL,
    user_id integer,
    detalhe character varying(500),
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: salas_historico_id_historico_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salas_historico_id_historico_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salas_historico_id_historico_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salas_historico_id_historico_seq OWNED BY public.salas_historico.id_historico;


--
-- Name: salas_sala_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salas_sala_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salas_sala_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salas_sala_id_seq OWNED BY public.salas.sala_id;


--
-- Name: salas_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salas_tipo (
    sala_tipo_id integer NOT NULL,
    sala_tipo_nome character varying(255)
);


--
-- Name: salas_tipo_sala_tipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salas_tipo_sala_tipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salas_tipo_sala_tipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salas_tipo_sala_tipo_id_seq OWNED BY public.salas_tipo.sala_tipo_id;


--
-- Name: scdp_viagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scdp_viagens (
    id_viagem integer NOT NULL,
    ano integer NOT NULL,
    data_cadastro date,
    pcdp character varying(30),
    solicitante character varying(255),
    grupo_tipo character varying(120),
    cpf character varying(20),
    proposto character varying(255),
    subunidade_id integer,
    subunidade_texto character varying(255),
    fonte_recurso character varying(120),
    num_diarias numeric(8,2),
    valor_diarias numeric(14,2),
    valor_passagens_aereas numeric(14,2),
    valor_passagens_rodoviarias numeric(14,2),
    periodo_viagem character varying(120),
    origem_aba character varying(80) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origem character varying(10) DEFAULT 'importado'::character varying NOT NULL,
    created_by_user_id integer
);


--
-- Name: scdp_viagens_id_viagem_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scdp_viagens_id_viagem_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scdp_viagens_id_viagem_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scdp_viagens_id_viagem_seq OWNED BY public.scdp_viagens.id_viagem;


--
-- Name: subunidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subunidades (
    subunidade_id integer NOT NULL,
    subunidade_nome character varying(255),
    subunidade_codigo text,
    predio_id integer,
    subunidade_email character varying(255),
    createdat timestamp with time zone,
    updatedat timestamp with time zone,
    updatedforuser integer,
    unidade_id integer NOT NULL,
    subunidade_sigla text,
    chefe integer,
    is_direcao_centro boolean DEFAULT false NOT NULL
);


--
-- Name: subunidades_apelidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subunidades_apelidos (
    id_apelido integer NOT NULL,
    apelido character varying(255) NOT NULL,
    subunidade_id integer NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: subunidades_apelidos_id_apelido_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subunidades_apelidos_id_apelido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subunidades_apelidos_id_apelido_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subunidades_apelidos_id_apelido_seq OWNED BY public.subunidades_apelidos.id_apelido;


--
-- Name: subunidades_subunidade_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subunidades_subunidade_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subunidades_subunidade_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subunidades_subunidade_id_seq OWNED BY public.subunidades.subunidade_id;


--
-- Name: tipos_despesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_despesas (
    id_tipo_despesa integer NOT NULL,
    tipo_despesa character varying(100),
    descricao_despesa character varying(255)
);


--
-- Name: tipos_despesas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_despesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_despesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_despesas_id_seq OWNED BY public.tipos_despesas.id_tipo_despesa;


--
-- Name: tipos_recursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_recursos (
    id_tipo_recurso integer NOT NULL,
    tipo_recurso character varying(100),
    descricao_recurso character varying(255)
);


--
-- Name: tipos_recursos_id_tipo_recurso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_recursos_id_tipo_recurso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_recursos_id_tipo_recurso_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_recursos_id_tipo_recurso_seq OWNED BY public.tipos_recursos.id_tipo_recurso;


--
-- Name: transferencias_recurso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transferencias_recurso (
    id_transferencia integer NOT NULL,
    ano integer NOT NULL,
    data date,
    num_transferencia character varying(30),
    subunidade_id integer,
    subunidade_texto character varying(255),
    solicitante character varying(255),
    usuario_sie character varying(255),
    gestora_destino character varying(255),
    cod_natureza character varying(20),
    tipo_despesa character varying(120),
    valor numeric(14,2),
    contado_em_outra_guia boolean,
    observacao text,
    origem_aba character varying(80) NOT NULL,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origem character varying(10) DEFAULT 'importado'::character varying NOT NULL,
    created_by_user_id integer
);


--
-- Name: transferencias_recurso_id_transferencia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transferencias_recurso_id_transferencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transferencias_recurso_id_transferencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transferencias_recurso_id_transferencia_seq OWNED BY public.transferencias_recurso.id_transferencia;


--
-- Name: turmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turmas (
    id_turma integer NOT NULL,
    disciplina_id integer NOT NULL,
    periodo_letivo_id integer NOT NULL,
    nome_turma character varying(30) NOT NULL,
    professor_user_id integer,
    vagas integer,
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    curso_id integer,
    id_turma_externo integer
);


--
-- Name: turmas_horarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turmas_horarios (
    id_horario integer NOT NULL,
    turma_id integer NOT NULL,
    dia_semana integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    sala_id integer,
    tipo_aula character varying(20),
    data_inicio date,
    data_fim date
);


--
-- Name: turmas_horarios_id_horario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.turmas_horarios_id_horario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: turmas_horarios_id_horario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.turmas_horarios_id_horario_seq OWNED BY public.turmas_horarios.id_horario;


--
-- Name: turmas_id_turma_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.turmas_id_turma_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: turmas_id_turma_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.turmas_id_turma_seq OWNED BY public.turmas.id_turma;


--
-- Name: turmas_professores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turmas_professores (
    id integer NOT NULL,
    turma_id integer NOT NULL,
    user_id integer NOT NULL,
    encargo numeric(6,1)
);


--
-- Name: turmas_professores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.turmas_professores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: turmas_professores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.turmas_professores_id_seq OWNED BY public.turmas_professores.id;


--
-- Name: unidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades (
    unidade_id integer NOT NULL,
    unidade_codigo character varying(255),
    unidade character varying(255),
    unidade_sigla character varying(255)
);


--
-- Name: unidades_unidade_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_unidade_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_unidade_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_unidade_id_seq OWNED BY public.unidades.unidade_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    nome character varying(255),
    email character varying(255),
    siape character varying(255),
    senha character varying(255),
    data_nascimento timestamp with time zone,
    subunidade_id integer,
    whatsapp character varying(255),
    permissao character varying(255),
    createdat timestamp with time zone,
    updatedat timestamp with time zone,
    updatedforuser integer,
    unidade_id integer,
    cargo character varying(120),
    tipo_servidor character varying(1)
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: admin admin_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin ALTER COLUMN admin_id SET DEFAULT nextval('public.admin_admin_id_seq'::regclass);


--
-- Name: agendamentos id_agendamento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos ALTER COLUMN id_agendamento SET DEFAULT nextval('public.agendamentos_id_agendamento_seq'::regclass);


--
-- Name: agendamentos_ocorrencias id_ocorrencia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos_ocorrencias ALTER COLUMN id_ocorrencia SET DEFAULT nextval('public.agendamentos_ocorrencias_id_ocorrencia_seq'::regclass);


--
-- Name: almoxarifado_requisicoes id_requisicao; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almoxarifado_requisicoes ALTER COLUMN id_requisicao SET DEFAULT nextval('public.almoxarifado_requisicoes_id_requisicao_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: assistente_conversas id_conversa; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistente_conversas ALTER COLUMN id_conversa SET DEFAULT nextval('public.assistente_conversas_id_conversa_seq'::regclass);


--
-- Name: assistente_mensagens id_mensagem; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistente_mensagens ALTER COLUMN id_mensagem SET DEFAULT nextval('public.assistente_mensagens_id_mensagem_seq'::regclass);


--
-- Name: bens_permanentes id_bem; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bens_permanentes ALTER COLUMN id_bem SET DEFAULT nextval('public.bens_permanentes_id_bem_seq'::regclass);


--
-- Name: comunicados id_comunicado; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados ALTER COLUMN id_comunicado SET DEFAULT nextval('public.comunicados_id_comunicado_seq'::regclass);


--
-- Name: cursos id_curso; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos ALTER COLUMN id_curso SET DEFAULT nextval('public.cursos_id_curso_seq'::regclass);


--
-- Name: despesas id_despesa; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas ALTER COLUMN id_despesa SET DEFAULT nextval('public.despesas_id_despesa_seq'::regclass);


--
-- Name: disciplinas id_disciplina; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas ALTER COLUMN id_disciplina SET DEFAULT nextval('public.disciplinas_id_disciplina_seq'::regclass);


--
-- Name: empenhos id_empenho; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empenhos ALTER COLUMN id_empenho SET DEFAULT nextval('public.empenhos_id_empenho_seq'::regclass);


--
-- Name: funcionalidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionalidades ALTER COLUMN id SET DEFAULT nextval('public.funcionalidades_id_seq'::regclass);


--
-- Name: importacoes_financeiro id_importacao; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.importacoes_financeiro ALTER COLUMN id_importacao SET DEFAULT nextval('public.importacoes_financeiro_id_importacao_seq'::regclass);


--
-- Name: itens_pedido_almoxarifado id_item; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_almoxarifado ALTER COLUMN id_item SET DEFAULT nextval('public.itens_pedido_almoxarifado_id_item_seq'::regclass);


--
-- Name: licitacoes_itens id_item; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitacoes_itens ALTER COLUMN id_item SET DEFAULT nextval('public.licitacoes_itens_id_item_seq'::regclass);


--
-- Name: manutencao_tipos id_tipo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencao_tipos ALTER COLUMN id_tipo SET DEFAULT nextval('public.manutencao_tipos_id_tipo_seq'::regclass);


--
-- Name: manutencoes id_manutencao; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes ALTER COLUMN id_manutencao SET DEFAULT nextval('public.manutencoes_id_manutencao_seq'::regclass);


--
-- Name: naturezas_despesa id_natureza; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naturezas_despesa ALTER COLUMN id_natureza SET DEFAULT nextval('public.naturezas_despesa_id_natureza_seq'::regclass);


--
-- Name: orcamento_dotacoes id_dotacao; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orcamento_dotacoes ALTER COLUMN id_dotacao SET DEFAULT nextval('public.orcamento_dotacoes_id_dotacao_seq'::regclass);


--
-- Name: patrimonio_historico id_historico; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrimonio_historico ALTER COLUMN id_historico SET DEFAULT nextval('public.patrimonio_historico_id_historico_seq'::regclass);


--
-- Name: pedidos_almoxarifado id_pedido; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_almoxarifado ALTER COLUMN id_pedido SET DEFAULT nextval('public.pedidos_almoxarifado_id_pedido_seq'::regclass);


--
-- Name: periodos_letivos id_periodo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_letivos ALTER COLUMN id_periodo SET DEFAULT nextval('public.periodos_letivos_id_periodo_seq'::regclass);


--
-- Name: permissoes_usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes_usuario ALTER COLUMN id SET DEFAULT nextval('public.permissoes_usuario_id_seq'::regclass);


--
-- Name: predios predio_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios ALTER COLUMN predio_id SET DEFAULT nextval('public.predios_predio_id_seq'::regclass);


--
-- Name: previsoes_despesas id_previsao; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.previsoes_despesas ALTER COLUMN id_previsao SET DEFAULT nextval('public.previsoes_despesas_id_previsao_seq'::regclass);


--
-- Name: professores_disciplinas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professores_disciplinas ALTER COLUMN id SET DEFAULT nextval('public.professores_disciplinas_id_seq'::regclass);


--
-- Name: recursos_recebidos id_recurso_recebido; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recursos_recebidos ALTER COLUMN id_recurso_recebido SET DEFAULT nextval('public.recursos_recebidos_id_recurso_recebido_seq'::regclass);


--
-- Name: salas sala_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas ALTER COLUMN sala_id SET DEFAULT nextval('public.salas_sala_id_seq'::regclass);


--
-- Name: salas_historico id_historico; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas_historico ALTER COLUMN id_historico SET DEFAULT nextval('public.salas_historico_id_historico_seq'::regclass);


--
-- Name: salas_tipo sala_tipo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas_tipo ALTER COLUMN sala_tipo_id SET DEFAULT nextval('public.salas_tipo_sala_tipo_id_seq'::regclass);


--
-- Name: scdp_viagens id_viagem; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scdp_viagens ALTER COLUMN id_viagem SET DEFAULT nextval('public.scdp_viagens_id_viagem_seq'::regclass);


--
-- Name: subunidades subunidade_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subunidades ALTER COLUMN subunidade_id SET DEFAULT nextval('public.subunidades_subunidade_id_seq'::regclass);


--
-- Name: subunidades_apelidos id_apelido; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subunidades_apelidos ALTER COLUMN id_apelido SET DEFAULT nextval('public.subunidades_apelidos_id_apelido_seq'::regclass);


--
-- Name: tipos_despesas id_tipo_despesa; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_despesas ALTER COLUMN id_tipo_despesa SET DEFAULT nextval('public.tipos_despesas_id_seq'::regclass);


--
-- Name: tipos_recursos id_tipo_recurso; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_recursos ALTER COLUMN id_tipo_recurso SET DEFAULT nextval('public.tipos_recursos_id_tipo_recurso_seq'::regclass);


--
-- Name: transferencias_recurso id_transferencia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_recurso ALTER COLUMN id_transferencia SET DEFAULT nextval('public.transferencias_recurso_id_transferencia_seq'::regclass);


--
-- Name: turmas id_turma; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas ALTER COLUMN id_turma SET DEFAULT nextval('public.turmas_id_turma_seq'::regclass);


--
-- Name: turmas_horarios id_horario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_horarios ALTER COLUMN id_horario SET DEFAULT nextval('public.turmas_horarios_id_horario_seq'::regclass);


--
-- Name: turmas_professores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_professores ALTER COLUMN id SET DEFAULT nextval('public.turmas_professores_id_seq'::regclass);


--
-- Name: unidades unidade_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades ALTER COLUMN unidade_id SET DEFAULT nextval('public.unidades_unidade_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: admin admin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_pkey PRIMARY KEY (admin_id);


--
-- Name: agendamentos_ocorrencias agendamentos_ocorrencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos_ocorrencias
    ADD CONSTRAINT agendamentos_ocorrencias_pkey PRIMARY KEY (id_ocorrencia);


--
-- Name: agendamentos agendamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_pkey PRIMARY KEY (id_agendamento);


--
-- Name: almoxarifado_requisicoes almoxarifado_requisicoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almoxarifado_requisicoes
    ADD CONSTRAINT almoxarifado_requisicoes_pkey PRIMARY KEY (id_requisicao);


--
-- Name: api_keys api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_api_key_key UNIQUE (api_key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: assistente_conversas assistente_conversas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistente_conversas
    ADD CONSTRAINT assistente_conversas_pkey PRIMARY KEY (id_conversa);


--
-- Name: assistente_mensagens assistente_mensagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistente_mensagens
    ADD CONSTRAINT assistente_mensagens_pkey PRIMARY KEY (id_mensagem);


--
-- Name: bens_permanentes bens_permanentes_numero_registro_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bens_permanentes
    ADD CONSTRAINT bens_permanentes_numero_registro_key UNIQUE (numero_registro);


--
-- Name: bens_permanentes bens_permanentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bens_permanentes
    ADD CONSTRAINT bens_permanentes_pkey PRIMARY KEY (id_bem);


--
-- Name: comunicados comunicados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_pkey PRIMARY KEY (id_comunicado);


--
-- Name: configuracoes configuracoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes
    ADD CONSTRAINT configuracoes_pkey PRIMARY KEY (chave);


--
-- Name: cursos cursos_cod_curso_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_cod_curso_key UNIQUE (cod_curso);


--
-- Name: cursos cursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_pkey PRIMARY KEY (id_curso);


--
-- Name: despesas despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_pkey PRIMARY KEY (id_despesa);


--
-- Name: disciplinas disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_pkey PRIMARY KEY (id_disciplina);


--
-- Name: empenhos empenhos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empenhos
    ADD CONSTRAINT empenhos_pkey PRIMARY KEY (id_empenho);


--
-- Name: funcionalidades funcionalidades_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionalidades
    ADD CONSTRAINT funcionalidades_nome_key UNIQUE (nome);


--
-- Name: funcionalidades funcionalidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionalidades
    ADD CONSTRAINT funcionalidades_pkey PRIMARY KEY (id);


--
-- Name: importacoes_financeiro importacoes_financeiro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.importacoes_financeiro
    ADD CONSTRAINT importacoes_financeiro_pkey PRIMARY KEY (id_importacao);


--
-- Name: itens_pedido_almoxarifado itens_pedido_almoxarifado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_almoxarifado
    ADD CONSTRAINT itens_pedido_almoxarifado_pkey PRIMARY KEY (id_item);


--
-- Name: licitacoes_itens licitacoes_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitacoes_itens
    ADD CONSTRAINT licitacoes_itens_pkey PRIMARY KEY (id_item);


--
-- Name: manutencao_tipos manutencao_tipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencao_tipos
    ADD CONSTRAINT manutencao_tipos_pkey PRIMARY KEY (id_tipo);


--
-- Name: manutencoes manutencoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_pkey PRIMARY KEY (id_manutencao);


--
-- Name: naturezas_despesa naturezas_despesa_codigo_nome_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naturezas_despesa
    ADD CONSTRAINT naturezas_despesa_codigo_nome_unico UNIQUE (codigo, nome);


--
-- Name: naturezas_despesa naturezas_despesa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naturezas_despesa
    ADD CONSTRAINT naturezas_despesa_pkey PRIMARY KEY (id_natureza);


--
-- Name: orcamento_dotacoes orcamento_dotacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orcamento_dotacoes
    ADD CONSTRAINT orcamento_dotacoes_pkey PRIMARY KEY (id_dotacao);


--
-- Name: patrimonio_historico patrimonio_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrimonio_historico
    ADD CONSTRAINT patrimonio_historico_pkey PRIMARY KEY (id_historico);


--
-- Name: pedidos_almoxarifado pedidos_almoxarifado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_almoxarifado
    ADD CONSTRAINT pedidos_almoxarifado_pkey PRIMARY KEY (id_pedido);


--
-- Name: periodos_letivos periodos_letivos_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_letivos
    ADD CONSTRAINT periodos_letivos_nome_key UNIQUE (nome);


--
-- Name: periodos_letivos periodos_letivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_letivos
    ADD CONSTRAINT periodos_letivos_pkey PRIMARY KEY (id_periodo);


--
-- Name: permissoes_usuario permissoes_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes_usuario
    ADD CONSTRAINT permissoes_usuario_pkey PRIMARY KEY (id);


--
-- Name: predios predios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios
    ADD CONSTRAINT predios_pkey PRIMARY KEY (predio_id);


--
-- Name: previsoes_despesas previsoes_despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.previsoes_despesas
    ADD CONSTRAINT previsoes_despesas_pkey PRIMARY KEY (id_previsao);


--
-- Name: professores_disciplinas professores_disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professores_disciplinas
    ADD CONSTRAINT professores_disciplinas_pkey PRIMARY KEY (id);


--
-- Name: professores_disciplinas professores_disciplinas_user_disciplina_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professores_disciplinas
    ADD CONSTRAINT professores_disciplinas_user_disciplina_unique UNIQUE (user_id, disciplina_id);


--
-- Name: recursos_recebidos recursos_recebidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recursos_recebidos
    ADD CONSTRAINT recursos_recebidos_pkey PRIMARY KEY (id_recurso_recebido);


--
-- Name: salas_historico salas_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas_historico
    ADD CONSTRAINT salas_historico_pkey PRIMARY KEY (id_historico);


--
-- Name: salas salas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas
    ADD CONSTRAINT salas_pkey PRIMARY KEY (sala_id);


--
-- Name: salas_tipo salas_tipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas_tipo
    ADD CONSTRAINT salas_tipo_pkey PRIMARY KEY (sala_tipo_id);


--
-- Name: scdp_viagens scdp_viagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scdp_viagens
    ADD CONSTRAINT scdp_viagens_pkey PRIMARY KEY (id_viagem);


--
-- Name: subunidades_apelidos subunidades_apelidos_apelido_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subunidades_apelidos
    ADD CONSTRAINT subunidades_apelidos_apelido_key UNIQUE (apelido);


--
-- Name: subunidades_apelidos subunidades_apelidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subunidades_apelidos
    ADD CONSTRAINT subunidades_apelidos_pkey PRIMARY KEY (id_apelido);


--
-- Name: subunidades subunidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subunidades
    ADD CONSTRAINT subunidades_pkey PRIMARY KEY (subunidade_id);


--
-- Name: tipos_despesas tipos_despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_despesas
    ADD CONSTRAINT tipos_despesas_pkey PRIMARY KEY (id_tipo_despesa);


--
-- Name: tipos_recursos tipos_recursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_recursos
    ADD CONSTRAINT tipos_recursos_pkey PRIMARY KEY (id_tipo_recurso);


--
-- Name: transferencias_recurso transferencias_recurso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_recurso
    ADD CONSTRAINT transferencias_recurso_pkey PRIMARY KEY (id_transferencia);


--
-- Name: turmas_horarios turmas_horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_horarios
    ADD CONSTRAINT turmas_horarios_pkey PRIMARY KEY (id_horario);


--
-- Name: turmas turmas_id_turma_externo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_id_turma_externo_key UNIQUE (id_turma_externo);


--
-- Name: turmas turmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_pkey PRIMARY KEY (id_turma);


--
-- Name: turmas_professores turmas_professores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_professores
    ADD CONSTRAINT turmas_professores_pkey PRIMARY KEY (id);


--
-- Name: turmas_professores turmas_professores_turma_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_professores
    ADD CONSTRAINT turmas_professores_turma_user_unique UNIQUE (turma_id, user_id);


--
-- Name: unidades unidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT unidades_pkey PRIMARY KEY (unidade_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: agendamentos_ocorrencias_agendamento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_ocorrencias_agendamento_id ON public.agendamentos_ocorrencias USING btree (agendamento_id);


--
-- Name: agendamentos_ocorrencias_data_ocorrencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_ocorrencias_data_ocorrencia ON public.agendamentos_ocorrencias USING btree (data_ocorrencia);


--
-- Name: agendamentos_ocorrencias_status_individual; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_ocorrencias_status_individual ON public.agendamentos_ocorrencias USING btree (status_individual);


--
-- Name: agendamentos_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_origem ON public.agendamentos USING btree (origem);


--
-- Name: agendamentos_sala_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_sala_id ON public.agendamentos USING btree (sala_id);


--
-- Name: agendamentos_solicitante_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_solicitante_user_id ON public.agendamentos USING btree (solicitante_user_id);


--
-- Name: agendamentos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_status ON public.agendamentos USING btree (status);


--
-- Name: agendamentos_turma_horario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agendamentos_turma_horario_id ON public.agendamentos USING btree (turma_horario_id);


--
-- Name: almoxarifado_requisicoes_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX almoxarifado_requisicoes_ano ON public.almoxarifado_requisicoes USING btree (ano);


--
-- Name: almoxarifado_requisicoes_origem_aba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX almoxarifado_requisicoes_origem_aba ON public.almoxarifado_requisicoes USING btree (origem_aba);


--
-- Name: almoxarifado_requisicoes_origem_aba_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX almoxarifado_requisicoes_origem_aba_origem ON public.almoxarifado_requisicoes USING btree (origem_aba, origem);


--
-- Name: almoxarifado_requisicoes_subunidade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX almoxarifado_requisicoes_subunidade_id ON public.almoxarifado_requisicoes USING btree (subunidade_id);


--
-- Name: assistente_conversas_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assistente_conversas_user_id ON public.assistente_conversas USING btree (user_id);


--
-- Name: assistente_mensagens_conversa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assistente_mensagens_conversa_id ON public.assistente_mensagens USING btree (conversa_id);


--
-- Name: bens_permanentes_sala_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bens_permanentes_sala_id ON public.bens_permanentes USING btree (sala_id);


--
-- Name: disciplinas_subunidade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX disciplinas_subunidade_id ON public.disciplinas USING btree (subunidade_id);


--
-- Name: empenhos_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empenhos_ano ON public.empenhos USING btree (ano);


--
-- Name: empenhos_num_sie; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empenhos_num_sie ON public.empenhos USING btree (num_sie);


--
-- Name: empenhos_origem_aba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empenhos_origem_aba ON public.empenhos USING btree (origem_aba);


--
-- Name: empenhos_origem_aba_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empenhos_origem_aba_origem ON public.empenhos USING btree (origem_aba, origem);


--
-- Name: empenhos_subunidade_entrega_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empenhos_subunidade_entrega_id ON public.empenhos USING btree (subunidade_entrega_id);


--
-- Name: empenhos_tipo_despesa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empenhos_tipo_despesa ON public.empenhos USING btree (tipo_despesa);


--
-- Name: importacoes_financeiro_origem_aba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX importacoes_financeiro_origem_aba ON public.importacoes_financeiro USING btree (origem_aba);


--
-- Name: licitacoes_itens_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licitacoes_itens_ano ON public.licitacoes_itens USING btree (ano);


--
-- Name: licitacoes_itens_origem_aba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licitacoes_itens_origem_aba ON public.licitacoes_itens USING btree (origem_aba);


--
-- Name: licitacoes_itens_origem_aba_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licitacoes_itens_origem_aba_origem ON public.licitacoes_itens USING btree (origem_aba, origem);


--
-- Name: licitacoes_itens_subunidade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licitacoes_itens_subunidade_id ON public.licitacoes_itens USING btree (subunidade_id);


--
-- Name: licitacoes_itens_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licitacoes_itens_tipo ON public.licitacoes_itens USING btree (tipo);


--
-- Name: manutencoes_sala_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX manutencoes_sala_id ON public.manutencoes USING btree (sala_id);


--
-- Name: manutencoes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX manutencoes_status ON public.manutencoes USING btree (status);


--
-- Name: manutencoes_tipo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX manutencoes_tipo_id ON public.manutencoes USING btree (tipo_id);


--
-- Name: orcamento_dotacoes_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orcamento_dotacoes_ano ON public.orcamento_dotacoes USING btree (ano);


--
-- Name: orcamento_dotacoes_origem_aba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orcamento_dotacoes_origem_aba ON public.orcamento_dotacoes USING btree (origem_aba);


--
-- Name: orcamento_dotacoes_origem_aba_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orcamento_dotacoes_origem_aba_origem ON public.orcamento_dotacoes USING btree (origem_aba, origem);


--
-- Name: patrimonio_historico_bem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patrimonio_historico_bem_id ON public.patrimonio_historico USING btree (bem_id);


--
-- Name: patrimonio_historico_numero_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patrimonio_historico_numero_registro ON public.patrimonio_historico USING btree (numero_registro);


--
-- Name: permissoes_usuario_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissoes_usuario_unique ON public.permissoes_usuario USING btree (user_id, funcionalidade_id);


--
-- Name: salas_historico_sala_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX salas_historico_sala_id ON public.salas_historico USING btree (sala_id);


--
-- Name: salas_nome_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX salas_nome_unico ON public.salas USING btree (lower(TRIM(BOTH FROM sala_nome)));


--
-- Name: scdp_viagens_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scdp_viagens_ano ON public.scdp_viagens USING btree (ano);


--
-- Name: scdp_viagens_origem_aba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scdp_viagens_origem_aba ON public.scdp_viagens USING btree (origem_aba);


--
-- Name: scdp_viagens_origem_aba_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scdp_viagens_origem_aba_origem ON public.scdp_viagens USING btree (origem_aba, origem);


--
-- Name: scdp_viagens_subunidade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scdp_viagens_subunidade_id ON public.scdp_viagens USING btree (subunidade_id);


--
-- Name: transferencias_recurso_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transferencias_recurso_ano ON public.transferencias_recurso USING btree (ano);


--
-- Name: transferencias_recurso_origem_aba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transferencias_recurso_origem_aba ON public.transferencias_recurso USING btree (origem_aba);


--
-- Name: transferencias_recurso_origem_aba_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transferencias_recurso_origem_aba_origem ON public.transferencias_recurso USING btree (origem_aba, origem);


--
-- Name: transferencias_recurso_subunidade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transferencias_recurso_subunidade_id ON public.transferencias_recurso USING btree (subunidade_id);


--
-- Name: turmas_disciplina_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX turmas_disciplina_id ON public.turmas USING btree (disciplina_id);


--
-- Name: turmas_horarios_sala_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX turmas_horarios_sala_id ON public.turmas_horarios USING btree (sala_id);


--
-- Name: turmas_horarios_turma_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX turmas_horarios_turma_id ON public.turmas_horarios USING btree (turma_id);


--
-- Name: turmas_periodo_letivo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX turmas_periodo_letivo_id ON public.turmas USING btree (periodo_letivo_id);


--
-- Name: agendamentos agendamentos_aprovado_por_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_aprovado_por_user_id_fkey FOREIGN KEY (aprovado_por_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: agendamentos_ocorrencias agendamentos_ocorrencias_agendamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos_ocorrencias
    ADD CONSTRAINT agendamentos_ocorrencias_agendamento_id_fkey FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id_agendamento) ON DELETE CASCADE;


--
-- Name: agendamentos agendamentos_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(sala_id) ON DELETE RESTRICT;


--
-- Name: agendamentos agendamentos_solicitante_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_solicitante_user_id_fkey FOREIGN KEY (solicitante_user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- Name: agendamentos agendamentos_turma_horario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_turma_horario_id_fkey FOREIGN KEY (turma_horario_id) REFERENCES public.turmas_horarios(id_horario) ON DELETE CASCADE;


--
-- Name: almoxarifado_requisicoes almoxarifado_requisicoes_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almoxarifado_requisicoes
    ADD CONSTRAINT almoxarifado_requisicoes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: almoxarifado_requisicoes almoxarifado_requisicoes_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almoxarifado_requisicoes
    ADD CONSTRAINT almoxarifado_requisicoes_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: api_keys api_keys_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assistente_conversas assistente_conversas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistente_conversas
    ADD CONSTRAINT assistente_conversas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assistente_mensagens assistente_mensagens_conversa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistente_mensagens
    ADD CONSTRAINT assistente_mensagens_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.assistente_conversas(id_conversa) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bens_permanentes bens_permanentes_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bens_permanentes
    ADD CONSTRAINT bens_permanentes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bens_permanentes bens_permanentes_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bens_permanentes
    ADD CONSTRAINT bens_permanentes_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(sala_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bens_permanentes bens_permanentes_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bens_permanentes
    ADD CONSTRAINT bens_permanentes_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: comunicados comunicados_enviado_por_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_enviado_por_user_id_fkey FOREIGN KEY (enviado_por_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: disciplinas disciplinas_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON DELETE SET NULL;


--
-- Name: empenhos empenhos_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empenhos
    ADD CONSTRAINT empenhos_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: empenhos empenhos_subunidade_entrega_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empenhos
    ADD CONSTRAINT empenhos_subunidade_entrega_id_fkey FOREIGN KEY (subunidade_entrega_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: empenhos empenhos_subunidade_pagadora_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empenhos
    ADD CONSTRAINT empenhos_subunidade_pagadora_id_fkey FOREIGN KEY (subunidade_pagadora_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: funcionalidades funcionalidades_subunidade_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionalidades
    ADD CONSTRAINT funcionalidades_subunidade_responsavel_id_fkey FOREIGN KEY (subunidade_responsavel_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: importacoes_financeiro importacoes_financeiro_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.importacoes_financeiro
    ADD CONSTRAINT importacoes_financeiro_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: itens_pedido_almoxarifado itens_pedido_almoxarifado_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_almoxarifado
    ADD CONSTRAINT itens_pedido_almoxarifado_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos_almoxarifado(id_pedido) ON DELETE CASCADE;


--
-- Name: licitacoes_itens licitacoes_itens_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitacoes_itens
    ADD CONSTRAINT licitacoes_itens_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: licitacoes_itens licitacoes_itens_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitacoes_itens
    ADD CONSTRAINT licitacoes_itens_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: manutencoes manutencoes_concluido_por_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_concluido_por_user_id_fkey FOREIGN KEY (concluido_por_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: manutencoes manutencoes_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: manutencoes manutencoes_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(sala_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: manutencoes manutencoes_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.manutencao_tipos(id_tipo) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orcamento_dotacoes orcamento_dotacoes_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orcamento_dotacoes
    ADD CONSTRAINT orcamento_dotacoes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orcamento_dotacoes orcamento_dotacoes_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orcamento_dotacoes
    ADD CONSTRAINT orcamento_dotacoes_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patrimonio_historico patrimonio_historico_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrimonio_historico
    ADD CONSTRAINT patrimonio_historico_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bens_permanentes(id_bem) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patrimonio_historico patrimonio_historico_sala_anterior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrimonio_historico
    ADD CONSTRAINT patrimonio_historico_sala_anterior_id_fkey FOREIGN KEY (sala_anterior_id) REFERENCES public.salas(sala_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patrimonio_historico patrimonio_historico_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrimonio_historico
    ADD CONSTRAINT patrimonio_historico_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(sala_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: patrimonio_historico patrimonio_historico_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrimonio_historico
    ADD CONSTRAINT patrimonio_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pedidos_almoxarifado pedidos_almoxarifado_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_almoxarifado
    ADD CONSTRAINT pedidos_almoxarifado_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON DELETE RESTRICT;


--
-- Name: permissoes_usuario permissoes_usuario_concedido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes_usuario
    ADD CONSTRAINT permissoes_usuario_concedido_por_fkey FOREIGN KEY (concedido_por) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: permissoes_usuario permissoes_usuario_funcionalidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes_usuario
    ADD CONSTRAINT permissoes_usuario_funcionalidade_id_fkey FOREIGN KEY (funcionalidade_id) REFERENCES public.funcionalidades(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: permissoes_usuario permissoes_usuario_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes_usuario
    ADD CONSTRAINT permissoes_usuario_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: previsoes_despesas previsoes_despesas_id_tipo_despesa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.previsoes_despesas
    ADD CONSTRAINT previsoes_despesas_id_tipo_despesa_fkey FOREIGN KEY (id_tipo_despesa) REFERENCES public.tipos_despesas(id_tipo_despesa) ON DELETE RESTRICT;


--
-- Name: previsoes_despesas previsoes_despesas_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.previsoes_despesas
    ADD CONSTRAINT previsoes_despesas_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON DELETE RESTRICT;


--
-- Name: professores_disciplinas professores_disciplinas_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professores_disciplinas
    ADD CONSTRAINT professores_disciplinas_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id_disciplina) ON DELETE CASCADE;


--
-- Name: professores_disciplinas professores_disciplinas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professores_disciplinas
    ADD CONSTRAINT professores_disciplinas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: salas salas_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas
    ADD CONSTRAINT salas_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: salas_historico salas_historico_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas_historico
    ADD CONSTRAINT salas_historico_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(sala_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: salas_historico salas_historico_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas_historico
    ADD CONSTRAINT salas_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: scdp_viagens scdp_viagens_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scdp_viagens
    ADD CONSTRAINT scdp_viagens_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: scdp_viagens scdp_viagens_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scdp_viagens
    ADD CONSTRAINT scdp_viagens_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: subunidades_apelidos subunidades_apelidos_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subunidades_apelidos
    ADD CONSTRAINT subunidades_apelidos_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transferencias_recurso transferencias_recurso_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_recurso
    ADD CONSTRAINT transferencias_recurso_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transferencias_recurso transferencias_recurso_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_recurso
    ADD CONSTRAINT transferencias_recurso_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: turmas turmas_curso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id_curso) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: turmas turmas_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id_disciplina) ON DELETE RESTRICT;


--
-- Name: turmas_horarios turmas_horarios_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_horarios
    ADD CONSTRAINT turmas_horarios_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(sala_id) ON DELETE RESTRICT;


--
-- Name: turmas_horarios turmas_horarios_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_horarios
    ADD CONSTRAINT turmas_horarios_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id_turma) ON DELETE CASCADE;


--
-- Name: turmas turmas_periodo_letivo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_periodo_letivo_id_fkey FOREIGN KEY (periodo_letivo_id) REFERENCES public.periodos_letivos(id_periodo) ON DELETE RESTRICT;


--
-- Name: turmas turmas_professor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_professor_user_id_fkey FOREIGN KEY (professor_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: turmas_professores turmas_professores_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_professores
    ADD CONSTRAINT turmas_professores_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id_turma) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: turmas_professores turmas_professores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas_professores
    ADD CONSTRAINT turmas_professores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(unidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Kle7SFOJ04fa7iZacdjlHEBK6HFrcT46rWhWrsqlvsi5uCm2eIbB3eno6KgNuRB

