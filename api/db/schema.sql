-- Schema dump gerado automaticamente. NÃO editar manualmente.
-- Origem: docker compose db (siccr) — 2026-07-10T17:20:41.538Z
-- Regenere com: npm run db:dump

--
-- PostgreSQL database dump
--

\restrict epAnok3PLu7GURbWBCQbbhlbIqJYpxrSr9vHay585YiRc5megBGH8iloDlm88qa

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
    createdat timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    sala_altura numeric(6,2)
);


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
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: bens_permanentes id_bem; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bens_permanentes ALTER COLUMN id_bem SET DEFAULT nextval('public.bens_permanentes_id_bem_seq'::regclass);


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
-- Name: funcionalidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionalidades ALTER COLUMN id SET DEFAULT nextval('public.funcionalidades_id_seq'::regclass);


--
-- Name: itens_pedido_almoxarifado id_item; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_almoxarifado ALTER COLUMN id_item SET DEFAULT nextval('public.itens_pedido_almoxarifado_id_item_seq'::regclass);


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
-- Name: salas_tipo sala_tipo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salas_tipo ALTER COLUMN sala_tipo_id SET DEFAULT nextval('public.salas_tipo_sala_tipo_id_seq'::regclass);


--
-- Name: subunidades subunidade_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subunidades ALTER COLUMN subunidade_id SET DEFAULT nextval('public.subunidades_subunidade_id_seq'::regclass);


--
-- Name: tipos_despesas id_tipo_despesa; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_despesas ALTER COLUMN id_tipo_despesa SET DEFAULT nextval('public.tipos_despesas_id_seq'::regclass);


--
-- Name: tipos_recursos id_tipo_recurso; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_recursos ALTER COLUMN id_tipo_recurso SET DEFAULT nextval('public.tipos_recursos_id_tipo_recurso_seq'::regclass);


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
-- Name: itens_pedido_almoxarifado itens_pedido_almoxarifado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_almoxarifado
    ADD CONSTRAINT itens_pedido_almoxarifado_pkey PRIMARY KEY (id_item);


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
-- Name: bens_permanentes_sala_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bens_permanentes_sala_id ON public.bens_permanentes USING btree (sala_id);


--
-- Name: disciplinas_subunidade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX disciplinas_subunidade_id ON public.disciplinas USING btree (subunidade_id);


--
-- Name: permissoes_usuario_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissoes_usuario_unique ON public.permissoes_usuario USING btree (user_id, funcionalidade_id);


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
-- Name: disciplinas disciplinas_subunidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_subunidade_id_fkey FOREIGN KEY (subunidade_id) REFERENCES public.subunidades(subunidade_id) ON DELETE SET NULL;


--
-- Name: funcionalidades funcionalidades_subunidade_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcionalidades
    ADD CONSTRAINT funcionalidades_subunidade_responsavel_id_fkey FOREIGN KEY (subunidade_responsavel_id) REFERENCES public.subunidades(subunidade_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: itens_pedido_almoxarifado itens_pedido_almoxarifado_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_almoxarifado
    ADD CONSTRAINT itens_pedido_almoxarifado_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos_almoxarifado(id_pedido) ON DELETE CASCADE;


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

\unrestrict epAnok3PLu7GURbWBCQbbhlbIqJYpxrSr9vHay585YiRc5megBGH8iloDlm88qa

