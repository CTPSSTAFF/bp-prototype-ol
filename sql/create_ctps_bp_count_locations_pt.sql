-- Table: public.ctps_bp_count_locations_pt_20230809

-- DROP TABLE IF EXISTS public.ctps_bp_count_locations_pt_20230809;

CREATE TABLE IF NOT EXISTS public.ctps_bp_count_locations_pt_20230809
(
    objectid integer NOT NULL,
    loc_id integer,
    description character varying(254) COLLATE pg_catalog."default",
    latitude numeric(38,8),
    longitude numeric(38,8),
    mpo character varying(30) COLLATE pg_catalog."default",
    facility_name character varying(80) COLLATE pg_catalog."default",
    facility_type character varying(30) COLLATE pg_catalog."default",
    town character varying(8000) COLLATE pg_catalog."default",
    gdb_geomattr_data bytea,
    shape geometry,
    CONSTRAINT enforce_srid_shape CHECK (st_srid(shape) = 26986)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.ctps_bp_count_locations_pt_20230809
    OWNER to gisadmin;

-- REVOKE ALL ON TABLE public.ctps_bp_count_locations_pt_20230809 FROM sde;

GRANT SELECT ON TABLE public.ctps_bp_count_locations_pt_20230809 TO gispublisher;

GRANT ALL ON TABLE public.ctps_bp_count_locations_pt_20230809 TO gisadmin;

GRANT SELECT ON TABLE public.ctps_bp_count_locations_pt_20230809 TO gispublisher;
-- Index: a1958_ix1

-- DROP INDEX IF EXISTS public.a1958_ix1;

CREATE INDEX IF NOT EXISTS a1958_ix1
    ON public.ctps_bp_count_locations_pt_20230809 USING gist
    (shape)
    TABLESPACE pg_default;
-- Index: r2221_sde_rowid_uk

-- DROP INDEX IF EXISTS public.r2221_sde_rowid_uk;

CREATE UNIQUE INDEX IF NOT EXISTS r2221_sde_rowid_uk
    ON public.ctps_bp_count_locations_pt_20230809 USING btree
    (objectid ASC NULLS LAST)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;