-- Table: public.ctps_ma_wo_brmpo_poly

-- DROP TABLE IF EXISTS public.ctps_ma_wo_brmpo_poly;

CREATE TABLE IF NOT EXISTS public.ctps_ma_wo_brmpo_poly
(
    objectid integer NOT NULL,
    area_acres numeric(38,8),
    fid_mgis_outline_poly integer,
    fid_ctps_brmpo_boundary_poly integer,
    orig_fid integer,
    gdb_geomattr_data bytea,
    shape geometry,
    CONSTRAINT enforce_srid_shape CHECK (st_srid(shape) = 26986)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.ctps_ma_wo_brmpo_poly
    OWNER to gisadmin;

-- REVOKE ALL ON TABLE public.ctps_ma_wo_brmpo_poly FROM sde;

GRANT SELECT ON TABLE public.ctps_ma_wo_brmpo_poly TO gispublisher;

GRANT ALL ON TABLE public.ctps_ma_wo_brmpo_poly TO gisadmin;

GRANT SELECT ON TABLE public.ctps_ma_wo_brmpo_poly TO gispublisher;
-- Index: a1952_ix1

-- DROP INDEX IF EXISTS public.a1952_ix1;

CREATE INDEX IF NOT EXISTS a1952_ix1
    ON public.ctps_ma_wo_brmpo_poly USING gist
    (shape)
    TABLESPACE pg_default;
-- Index: r2215_sde_rowid_uk

-- DROP INDEX IF EXISTS public.r2215_sde_rowid_uk;

CREATE UNIQUE INDEX IF NOT EXISTS r2215_sde_rowid_uk
    ON public.ctps_ma_wo_brmpo_poly USING btree
    (objectid ASC NULLS LAST)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;