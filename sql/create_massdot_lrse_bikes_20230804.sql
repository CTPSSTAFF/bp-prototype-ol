-- Table: public.massdot_lrse_bikes_20230804

-- DROP TABLE IF EXISTS public.massdot_lrse_bikes_20230804;

CREATE TABLE IF NOT EXISTS public.massdot_lrse_bikes_20230804
(
    objectid integer NOT NULL,
    globalid character varying(38) COLLATE pg_catalog."default" NOT NULL DEFAULT '{00000000-0000-0000-0000-000000000000}'::character varying,
    route_id character varying(255) COLLATE pg_catalog."default",
    from_measure numeric(38,8),
    to_measure numeric(38,8),
    local_name character varying(100) COLLATE pg_catalog."default",
    alt_name character varying(254) COLLATE pg_catalog."default",
    reg_name character varying(254) COLLATE pg_catalog."default",
    sign_rte smallint,
    fac_type smallint,
    fac_plan smallint,
    projectnum character varying(10) COLLATE pg_catalog."default",
    datasource character varying(100) COLLATE pg_catalog."default",
    muni_id smallint,
    open_date timestamp without time zone,
    signed_route smallint,
    planned_facility_status smallint,
    back_check smallint,
    path_surface smallint,
    from_date timestamp without time zone,
    to_date timestamp without time zone,
    event_id character varying(50) COLLATE pg_catalog."default",
    locerror character varying(100) COLLATE pg_catalog."default",
    created_user character varying(255) COLLATE pg_catalog."default",
    created_date timestamp without time zone,
    last_edited_user character varying(255) COLLATE pg_catalog."default",
    last_edited_date timestamp without time zone,
    bike_notes character varying(99) COLLATE pg_catalog."default",
    projectlink character varying(255) COLLATE pg_catalog."default",
    priority_trail smallint,
    gdb_geomattr_data bytea,
    shape geometry,
    CONSTRAINT enforce_srid_shape CHECK (st_srid(shape) = 26986)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.massdot_lrse_bikes_20230804
    OWNER to gisadmin;

-- REVOKE ALL ON TABLE public.massdot_lrse_bikes_20230804 FROM sde;

GRANT SELECT ON TABLE public.massdot_lrse_bikes_20230804 TO gispublisher;

GRANT ALL ON TABLE public.massdot_lrse_bikes_20230804 TO gisadmin;

GRANT SELECT ON TABLE public.massdot_lrse_bikes_20230804 TO gispublisher;
-- Index: a1957_ix1

-- DROP INDEX IF EXISTS public.a1957_ix1;

CREATE INDEX IF NOT EXISTS a1957_ix1
    ON public.massdot_lrse_bikes_20230804 USING gist
    (shape)
    TABLESPACE pg_default;
-- Index: r2220_sde_rowid_uk

-- DROP INDEX IF EXISTS public.r2220_sde_rowid_uk;

CREATE UNIQUE INDEX IF NOT EXISTS r2220_sde_rowid_uk
    ON public.massdot_lrse_bikes_20230804 USING btree
    (objectid ASC NULLS LAST)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;
-- Index: uuid_2220

-- DROP INDEX IF EXISTS public.uuid_2220;

CREATE INDEX IF NOT EXISTS uuid_2220
    ON public.massdot_lrse_bikes_20230804 USING btree
    (globalid COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;