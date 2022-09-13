--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: pg_prewarm; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS pg_prewarm WITH SCHEMA public;


--
-- Name: EXTENSION pg_prewarm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_prewarm IS 'prewarm relation data';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry, geography, and raster spatial types and functions';


--
-- Name: area; Type: TABLE; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE TABLE public.area (
    unavco_name character varying,
    project_name character varying,
    longitude double precision,
    latitude double precision,
    country character varying,
    region character varying,
    numchunks integer,
    attributekeys character varying[],
    attributevalues character varying[],
    stringdates character varying[],
    decimaldates double precision[],
    id integer NOT NULL
);


ALTER TABLE public.area OWNER TO insaradmin;



--
-- Name: area_allowed_permissions; Type: TABLE; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE TABLE public.area_allowed_permissions (
    id integer NOT NULL,
    area_id integer NOT NULL,
    permission character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.area_allowed_permissions OWNER TO insaradmin;

--
-- Name: area_allowed_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: insaradmin
--

CREATE SEQUENCE public.area_allowed_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.area_allowed_permissions_id_seq OWNER TO insaradmin;

--
-- Name: area_allowed_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: insaradmin
--

ALTER SEQUENCE public.area_allowed_permissions_id_seq OWNED BY public.area_allowed_permissions.id;


--
-- Name: area_id_seq; Type: SEQUENCE; Schema: public; Owner: insaradmin
--

CREATE SEQUENCE public.area_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.area_id_seq OWNER TO insaradmin;

--
-- Name: area_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: insaradmin
--

ALTER SEQUENCE public.area_id_seq OWNED BY public.area.id;


--
-- Name: extra_attributes; Type: TABLE; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE TABLE public.extra_attributes (
    area_id integer,
    attributekey character varying,
    attributevalue character varying
);


ALTER TABLE public.extra_attributes OWNER TO insaradmin;

SET default_tablespace = '';



--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE TABLE public.password_resets (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone NOT NULL
);


ALTER TABLE public.password_resets OWNER TO insaradmin;



--
-- Name: plot_attributes; Type: TABLE; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE TABLE public.plot_attributes (
    area_id integer,
    attributekey character varying,
    attributevalue json
);


ALTER TABLE public.plot_attributes OWNER TO insaradmin;



--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.user_permissions OWNER TO insaradmin;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: insaradmin
--

CREATE SEQUENCE public.user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_permissions_id_seq OWNER TO insaradmin;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: insaradmin
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    "isAdmin" smallint DEFAULT (0)::smallint NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.users OWNER TO insaradmin;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: insaradmin
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO insaradmin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: insaradmin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;



--
-- Name: area id; Type: DEFAULT; Schema: public; Owner: insaradmin
--

ALTER TABLE ONLY public.area ALTER COLUMN id SET DEFAULT nextval('public.area_id_seq'::regclass);



--
-- Name: area_allowed_permissions id; Type: DEFAULT; Schema: public; Owner: insaradmin
--

ALTER TABLE ONLY public.area_allowed_permissions ALTER COLUMN id SET DEFAULT nextval('public.area_allowed_permissions_id_seq'::regclass);



--
-- Name: area_id_idx; Type: INDEX; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE INDEX area_id_idx ON public.extra_attributes USING btree (area_id);



--
-- Name: password_resets_email_index; Type: INDEX; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE INDEX password_resets_email_index ON public.password_resets USING btree (email);


--
-- Name: password_resets_token_index; Type: INDEX; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

CREATE INDEX password_resets_token_index ON public.password_resets USING btree (token);



--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: insaradmin
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: insaradmin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);



--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: area_allowed_permissions area_allowed_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

ALTER TABLE ONLY public.area_allowed_permissions
    ADD CONSTRAINT area_allowed_permissions_pkey PRIMARY KEY (id);


--
-- Name: area area_pkey; Type: CONSTRAINT; Schema: public; Owner: insaradmin; Tablespace: datatablespace
--

ALTER TABLE ONLY public.area
    ADD CONSTRAINT area_pkey PRIMARY KEY (id);


