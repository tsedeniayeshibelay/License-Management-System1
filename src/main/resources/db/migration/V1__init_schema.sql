
    create table activations (
        is_active boolean,
        activated_at timestamp(6),
        deactivated_at timestamp(6),
        device_id bigint not null,
        id bigserial not null,
        license_id bigint not null,
        primary key (id)
    );

    create table admin_logs (
        admin_id bigint not null,
        created_at timestamp(6),
        id bigserial not null,
        action varchar(255) not null,
        details TEXT,
        ip_address varchar(255),
        primary key (id)
    );

    create table companies (
        created_at timestamp(6),
        id bigserial not null,
        address TEXT,
        email varchar(255) not null unique,
        industry varchar(255),
        name varchar(255) not null,
        phone varchar(255),
        status varchar(255) not null,
        website varchar(255),
        primary key (id)
    );

    create table devices (
        is_active boolean,
        activated_at timestamp(6),
        created_at timestamp(6),
        id bigserial not null,
        last_seen timestamp(6),
        user_id bigint not null,
        device_name varchar(255),
        fingerprint varchar(255) unique,
        ip_address varchar(255),
        machine_id varchar(255) not null unique,
        os varchar(255),
        os_version varchar(255),
        primary key (id)
    );

    create table email_logs (
        id bigserial not null,
        license_id bigint not null,
        sent_at timestamp(6),
        user_id bigint not null,
        content TEXT,
        email_type varchar(255) not null,
        subject varchar(255),
        primary key (id)
    );

    create table licenses (
        expiry_date date not null,
        hardware_locked boolean,
        issued_date date not null,
        max_activations integer,
        total_seats integer,
        used_seats integer,
        company_id bigint not null,
        created_at timestamp(6),
        id bigserial not null,
        product_id bigint not null,
        user_id bigint not null,
        short_code varchar(20) unique,
        license_key varchar(50) not null unique,
        license_type varchar(255) not null,
        status varchar(255) not null,
        primary key (id)
    );

    create table products (
        max_activations integer,
        price float(53),
        company_id bigint not null,
        created_at timestamp(6),
        id bigserial not null,
        description varchar(255),
        license_type varchar(255) not null,
        name varchar(255) not null,
        version varchar(255),
        primary key (id)
    );

    create table usage_logs (
        duration_minutes integer,
        created_at timestamp(6),
        device_id bigint,
        id bigserial not null,
        license_id bigint not null,
        session_end timestamp(6),
        session_start timestamp(6),
        user_id bigint not null,
        features_used TEXT,
        ip_address varchar(255),
        primary key (id)
    );

    create table users (
        company_id bigint,
        created_at timestamp(6),
        id bigserial not null,
        company varchar(255),
        email varchar(255) not null unique,
        full_name varchar(255) not null,
        password varchar(255) not null,
        phone varchar(255),
        role varchar(255) not null,
        status varchar(255) not null,
        username varchar(255) not null unique,
        primary key (id)
    );

    alter table if exists activations 
       add constraint FKeer55m93hkyvntlcvxrn7v8w5 
       foreign key (device_id) 
       references devices;

    alter table if exists activations 
       add constraint FKj1rf0r7swfn4w5usqa9lbqt90 
       foreign key (license_id) 
       references licenses;

    alter table if exists admin_logs 
       add constraint FKoix4xxbvhimiroqel44k3h7uk 
       foreign key (admin_id) 
       references users;

    alter table if exists devices 
       add constraint FKrfbri1ymrwywdydc4dgywe1bt 
       foreign key (user_id) 
       references users;

    alter table if exists email_logs 
       add constraint FKkxvax81a1pw9oibrtssibvaet 
       foreign key (license_id) 
       references licenses;

    alter table if exists email_logs 
       add constraint FK53riqu0yyo0de9vp07u9n4hbp 
       foreign key (user_id) 
       references users;

    alter table if exists licenses 
       add constraint FKi8gu2ax8h0amolou4drgs9d99 
       foreign key (company_id) 
       references companies;

    alter table if exists licenses 
       add constraint FKrwbu30er6kfs9bsiu91xa0vre 
       foreign key (product_id) 
       references products;

    alter table if exists licenses 
       add constraint FKe5lglta0iih9hpklacova3avm 
       foreign key (user_id) 
       references users;

    alter table if exists products 
       add constraint FKr67nkbovcmogr3o5xkmfepgl1 
       foreign key (company_id) 
       references companies;

    alter table if exists usage_logs 
       add constraint FKs2w4l9ilgxgslu3f3lptqy7ja 
       foreign key (device_id) 
       references devices;

    alter table if exists usage_logs 
       add constraint FKxmq8snekume63lnnbetgyyqp 
       foreign key (license_id) 
       references licenses;

    alter table if exists usage_logs 
       add constraint FKdq7yihn76rhgvl75sdwgow6vg 
       foreign key (user_id) 
       references users;

    alter table if exists users 
       add constraint FKin8gn4o1hpiwe6qe4ey7ykwq7 
       foreign key (company_id) 
       references companies;
