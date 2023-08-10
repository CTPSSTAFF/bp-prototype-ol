-- Table: public.ctps_bp_counts_20230809

-- DROP TABLE IF EXISTS public.ctps_bp_counts_20230809;

CREATE TABLE IF NOT EXISTS public.ctps_bp_counts_20230809
(
    objectid integer NOT NULL,
    id integer,
    bp_loc_id integer,
    count_id integer,
    description character varying(8000) COLLATE pg_catalog."default",
    temperature integer,
    sky integer,
    count_type character varying(8000) COLLATE pg_catalog."default",
    town character varying(8000) COLLATE pg_catalog."default",
    from_st_dir character varying(8000) COLLATE pg_catalog."default",
    to_st_name character varying(8000) COLLATE pg_catalog."default",
    to_st_dir character varying(8000) COLLATE pg_catalog."default",
    count_date timestamp without time zone,
    count_dow smallint,
    cnt_0630 integer,
    cnt_0645 integer,
    cnt_0700 integer,
    cnt_0715 integer,
    cnt_0730 integer,
    cnt_0745 integer,
    cnt_0800 integer,
    cnt_0815 integer,
    cnt_0830 integer,
    cnt_0845 integer,
    cnt_0900 integer,
    cnt_0915 integer,
    cnt_0930 integer,
    cnt_0945 integer,
    cnt_1000 integer,
    cnt_1015 integer,
    cnt_1030 integer,
    cnt_1045 integer,
    cnt_1100 integer,
    cnt_1115 integer,
    cnt_1130 integer,
    cnt_1145 integer,
    cnt_1200 integer,
    cnt_1215 integer,
    cnt_1230 integer,
    cnt_1245 integer,
    cnt_1300 integer,
    cnt_1315 integer,
    cnt_1330 integer,
    cnt_1345 integer,
    cnt_1400 integer,
    cnt_1415 integer,
    cnt_1430 integer,
    cnt_1445 integer,
    cnt_1500 integer,
    cnt_1515 integer,
    cnt_1530 integer,
    cnt_1545 integer,
    cnt_1600 integer,
    cnt_1615 integer,
    cnt_1630 integer,
    cnt_1645 integer,
    cnt_1700 integer,
    cnt_1715 integer,
    cnt_1730 integer,
    cnt_1745 integer,
    cnt_1800 integer,
    cnt_1815 integer,
    cnt_1830 integer,
    cnt_1845 integer,
    cnt_1900 integer,
    cnt_1915 integer,
    cnt_1930 integer,
    cnt_1945 integer,
    cnt_2000 integer,
    cnt_2015 integer,
    cnt_2030 integer,
    cnt_2045 integer,
    cnt_total integer
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.ctps_bp_counts_20230809
    OWNER to gisadmin;

GRANT SELECT ON TABLE public.ctps_bp_counts_20230809 TO gispublisher;

GRANT ALL ON TABLE public.ctps_bp_counts_20230809 TO gisadmin;
-- Index: r2222_sde_rowid_uk

-- DROP INDEX IF EXISTS public.r2222_sde_rowid_uk;

CREATE UNIQUE INDEX IF NOT EXISTS r2222_sde_rowid_uk
    ON public.ctps_bp_counts_20230809 USING btree
    (objectid ASC NULLS LAST)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;