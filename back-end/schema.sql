
CREATE TABLE projects (
        id UUID NOT NULL, 
        name VARCHAR NOT NULL, 
        description TEXT, 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
        updated_at TIMESTAMP WITH TIME ZONE, 
        PRIMARY KEY (id)
);

CREATE TABLE chapters (
        id UUID NOT NULL, 
        project_id UUID NOT NULL, 
        chapter_number INTEGER NOT NULL, 
        title VARCHAR NOT NULL, 
        content TEXT, 
        summary TEXT, 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
        updated_at TIMESTAMP WITH TIME ZONE, 
        PRIMARY KEY (id), 
        FOREIGN KEY(project_id) REFERENCES projects (id)
);

CREATE TABLE entity_versions (
        id UUID NOT NULL, 
        project_id UUID NOT NULL, 
        entity_type VARCHAR NOT NULL, 
        entity_id VARCHAR NOT NULL, 
        version INTEGER NOT NULL, 
        valid_from_chapter INTEGER NOT NULL, 
        valid_to_chapter INTEGER, 
        is_current BOOLEAN NOT NULL, 
        payload_json JSONB NOT NULL, 
        embedding VECTOR(1536), 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
        PRIMARY KEY (id), 
        FOREIGN KEY(project_id) REFERENCES projects (id)
);
