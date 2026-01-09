/**
 * @file Tree-sitter grammar for Mim, the front-end language of MimIR
 * @author Manuel Lata <contact@mlata.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  def: -2,
  bot: -1,
  where: 1,
  arrow: 2,
  pi: 3,
  ann: 4,
  inj: 5,
  app: 6,
  union: 7,
  ext: 8,
};

const PUNCTUATION = [
  "(", ")", "[", "]", "{", "}",
  "‹", "›", "«", "»", "<<", ">>", "<", ">",
  "=", ",", ";", ".", "#", ":", "%", "@",
]

// build pattern rule
//
// - paren: whether paren style patterns are allowed
// - implicit: whether implicit (brace) pattern are allowed
// - prec: current precedence
function mk_pattern($, paren, implicit, cur_prec=PREC.bot) {
  const options = [
    mk_tuple_pattern($, paren, implicit),
    ...(paren ? [$.identifier] : []),
    seq($.expression, $._type_annotation),
    // prec(cur_prec, $.expression),
  ];

  // return directly if only one option, otherwise use choice
  return options.length === 1 ? options[0] : choice(...options);
}

function mk_tuple_pattern($, paren, implicit) {
  const open = [
    "[",
    ...(paren    ? ["("] : []),
    ...(implicit ? ["{"] : []),
  ];
  const close = [
    "]",
    ...(paren    ? [")"] : []),
    ...(implicit ? ["}"] : []),
  ];

  // Build pattern choice based on parameters
  const patternChoice = paren ? $._ptrn_paren : $._ptrn_brack;

  return seq(
    open.length === 1 ? open[0] : choice(...open),
    optional(
      seq(
        choice(
          patternChoice,
          $.group,
        ),
        repeat(
          seq(
            ",",
            choice(
              patternChoice,
              $.group,
            )
          )
        ),
      ),
    ),
    close.length === 1 ? close[0] : choice(...close),
  )
}

module.exports = grammar({
  name: "mim",

  word: $ => $.identifier,

  externals: $ => [
    $.doc_content,
    $.error_sentinel,
  ],

  extras: $ => [
    /\s/,
    $.line_comment,
    $.doc_comment,
    $.block_comment,
  ],

  supertypes: $ => [
    $.dependency,
    $.declaration,
    $.expression,
    $.primary_expression,
    $.infix_expression,
  ],

  conflicts: $ => [
    [$.primary_expression, $._ptrn_paren],
    [$._ptrn_paren, $._ptrn_brack],
  ],

  rules: {
    source_file: $ => seq(
      repeat($.dependency),
      optional($._declarations),
    ),

    dependency: $ => choice(
      $.import,
      $.plugin,
    ),

    import: $ => seq("import", $.identifier, ";"),

    plugin: $ => seq("plugin", $.identifier, ";"),

    _declarations: $ => prec.left(repeat1(seq(
      $.declaration,
      optional(";"),
    ))),

    declaration: $ => choice(
      $.let,
      $.lam,
      $.axiom,
    ),

    let: $ => prec(PREC.def, seq(
      "let",
      choice(mk_pattern($, true, false), $.annex),
      "=",
      field("value", $.expression),
    )),

    lam: $ => prec.left(PREC.def, seq(
      choice("lam", "con", "fun"),
      optional("extern"),
      field("name", $._name),
      repeat(seq(mk_pattern($, true, true, PREC.pi), optional($.filter))),
      optional(
        seq(
          ":",
          field("type", $.expression),
        )
      ),
      optional(
        seq(
          "=",
          field("value", $.expression),
        )
      ),
    )),

    filter: $ => seq("@", $.expression),

    axiom: $ => seq(
      "axm",
      field("name", $.annex),
      ":",
      field("type", $.expression),
      optional(
        seq(
          ",",
          field("normalizer", $.identifier),
        )
      ),
      optional(
        seq(
          ",",
          field("curry", $.int_literal),
          optional(
            seq(
              ",",
              field("trip", $.identifier),
            )
          ),
        )
      ),
    ),

    group: $ => seq(
      $.identifier,
      $.identifier,
      repeat($.identifier),
      $._type_annotation,
    ),

    _name: $ => choice($.identifier, $.annex),

    identifier: $ => /[_a-zA-Z][_a-zA-Z0-9]*/,

    annex: $ => prec.left(seq(
      "%",
      field("module", $.identifier),
      ".",
      field("name", $.identifier),
      optional(
        choice(
          seq(".", field("subtag", $.identifier)),
          $._subtags,
        )
      )
    )),

    _subtags: $ => seq(
      "(",
      field("subtag", $.identifier),
      repeat(
        seq(
          "=",
          field("subtag", $.identifier),
        )
      ),
      repeat(
        seq(
          ",",
          field("subtag", $.identifier),
          repeat(
            seq(
              "=",
              field("subtag", $.identifier),
            )
          )
        )
      ),
      optional(","),
      ")",
    ),

    _literal: $ => choice(
      $.bool_literal,
      $.int_literal,
      $.float_literal,
      $.string_literal,
      $.char_literal,
      $.other_literal,
    ),

    bool_literal: $ => choice("tt", "ff"),

    int_literal: $ => choice(
       // binary literal
      /[\+\-]?0[bB][01]+/,
       // oct literal
      /[\+\-]?0[oO][0-7]+/,
       // decimal literal
      /[\+\-]?[0-9]+/,
       // hexadecimal literal
      /[\+\-]?0[xX][0-9a-fA-F]+/,
    ),

    float_literal: $ => token(prec(-1, choice(
      // decimal float literal x.
      /[\+\-]?[0-9]+\.[0-9]*([eE][\+\-][0-9]+)?/,
      // decimal float literal .x
      /[\+\-]?[0-9]*\.[0-9]+([eE][\+\-][0-9]+)?/,
      // decimal float literal e
      /[\+\-]?[0-9]+[eE][\+\-][0-9]+/,
      // hexadecimal float literal x.
      /[\+\-]?[0-9a-fA-F]+\.[0-9a-fA-F]*([pP][\+\-][0-9]+)?/,
      // hexadecimal float literal .x
      /[\+\-]?[0-9a-fA-F]*\.[0-9a-fA-F]+([pP][\+\-][0-9]+)?/,
      // hexadecimal float literal p
      /[\+\-]?[0-9a-fA-F]+[pP][\+\-][0-9]+/,
    ))),

    string_literal: $ => /\"(\\\"|[^\"])*\"/,

    char_literal: $ => /\'(\\.|[^\'])\'/,

    other_literal: $ => choice("⊥", ".bot", "⊤", ".top"),

    expression: $ => choice(
      $.primary_expression,
      $.infix_expression,
    ),

    primary_expression: $ => prec.left(choice(
      $.primitive,
      $.identifier,
      $.annex,
      $._literal,
      $.decl_expr,
      $.pi,
      $.lambda,
      $.insert,
      $.ret,
      $.uniq,
      $.array,
      $.pack,
      $.tuple,
      $.match,
    )),

    primitive: $ => choice(
      "Univ",
      "Nat",
      "Idx",
      "Bool",
      "I1",
      "I8",
      "I16",
      "I32",
      "I64",
      "*", "★",
      "□"
    ),

    decl_expr: $ => seq(
      $._declarations,
      $.expression,
    ),

    _lm: $ => choice(
      "lm",
      "λ",
      "fn",
    ),

    _arrow: $ => choice(
      "->",
      "→"
    ),

    pi: $ => prec.left(choice(
      seq(mk_pattern($, false, true, PREC.pi), $._arrow, $.expression),
      seq("Cn", mk_pattern($, false, true)),
      seq("Fn", mk_pattern($, false, true, PREC.pi), $._arrow, $.expression),
    )),

    lambda: $ => choice(
      seq(
        $._lm, repeat1(mk_pattern($, true, true, PREC.pi)),
        optional(seq(":", $.expression)),
        "=", $.expression,
      ),
      seq(
        "cn", repeat1(mk_pattern($, true, true)),
        "=", $.expression,
      )
    ),

    // insertion expression: `ins ((0, 1), 2, 2)`
    insert: $ => seq(
      choice("ins", "insert"),
      "(",
      $.expression, // tuple to insert into
      ",",
      $.expression, // insertion index
      ",",
      $.expression, // insert value
      ")",
    ),

    uniq: $ => seq(
      choice("{|", "⦃"),
      $.expression, // singleton type
      choice("|}", "⦄")
    ),

    ret: $ => seq(
      "ret", mk_pattern($, true, false),
      "=", $.expression, // callee
      "$", $.expression, // argument
      ";", $.expression, // continuation body
    ),

    array: $ => seq(
      choice("«", "⟪", "<<"),
      field("size", $.expression),
      repeat(seq(
        ",", field("size", $.expression)
      )),
      optional(","),
      ";",
      field("type", $.expression),
      choice("»", "⟫", ">>"),
    ),

    pack: $ => seq(
      choice("‹", "⟨", "<"),
      $.expression,
      ";",
      $.expression,
      choice("›", "⟩", ">"),
    ),

    tuple: $ => seq(
      "(",
      optional(
        seq(
          $.expression,
          repeat(seq(",", $.expression)),
          optional(","),
        )
      ),
      ")",
    ),

    match: $ => prec.left(seq(
      "match",
      $.expression,
      "with",
      optional($.match_arm),
      repeat(
        seq(
          "|",
          $.match_arm,
        )
      )
    )),

    match_arm: $ => seq(
      mk_pattern($, true, false),
      "=>",
      $.expression,
    ),

    infix_expression: $ => choice(
      $.extraction,
      $.arrow,
      $.union,
      $.injection,
      $.application,
      $.where,
      $.annotated,
    ),

    extraction: $ => prec.left(PREC.ext, seq($.expression, "#", $.expression)),

    arrow: $ => prec.right(PREC.arrow,
      seq($.expression, choice("->", "→"), $.expression),
    ),

    union: $ => prec.left(PREC.union, seq(
      $.expression,
      repeat1(
        seq(
          "∪",
          $.expression,
        )
      )
    )),

    injection: $ => prec.left(PREC.inj, seq(
      $.expression,
      "inj",
      $.expression,
    )),

    application: $ => choice(
      prec.left(PREC.app, seq($.expression, $.expression)),
      prec.left(PREC.app, seq($.expression, "@", $.expression)),
    ),

    where: $ => prec.left(PREC.where, choice(
      seq(
        $.expression,
        seq(
          "where",
          repeat(choice($.declaration, ";")),
          "end",
        )
      ),
    )),

    annotated: $ => prec.left(PREC.ann, seq(
      field("value", $.expression),
      $._type_annotation,
    )),

    _type_annotation: $ => seq(":", field("type", $.expression)),

    line_comment: $ => /\/\/([^/].*)?/,

    doc_comment: $ => seq("///", $.doc_content),

    block_comment: $ => seq("/*", /[\/\*]?|(\*[^\/]|[^\*]\/|[^\/\*])*\*+/, "/"),

    _ptrn_paren: $ => mk_pattern($, true, false),
    _ptrn_brack: $ => mk_pattern($, false, false),

    error_sentinel: $ => "unused token",
  }
});
