#include "tree_sitter/parser.h"

#include <wctype.h>

enum TokenType {
    DOC_CONTENT,
    ERROR_SENTINEL
};

void *tree_sitter_mim_external_scanner_create() { return NULL; }

void tree_sitter_mim_external_scanner_destroy(void *payload) {
    // nothing to destroy
}

unsigned tree_sitter_mim_external_scanner_serialize(void *payload, char *buffer) {
    return 0;
}

void tree_sitter_mim_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    // nothing to deserialize
}

static inline bool is_num_char(int32_t c) { return c == '_' || iswdigit(c); }

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool process_doc_content(TSLexer *lexer) {
    lexer->result_symbol = DOC_CONTENT;
    for (;;) {
        if (lexer->eof(lexer)) {
            return true;
        }
        if (lexer->lookahead == '\n') {
            // Include the newline in the doc content node.
            // Line endings are useful for markdown injection.
            advance(lexer);
            return true;
        }
        advance(lexer);
    }
}

bool tree_sitter_mim_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    if (valid_symbols[ERROR_SENTINEL]) {
        return false;
    }

    if (valid_symbols[DOC_CONTENT]) {
        return process_doc_content(lexer);
    }

    while (iswspace(lexer->lookahead)) {
        skip(lexer);
    }

    return false;
}
