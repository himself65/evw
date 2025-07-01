use swc_core::common::{Span, Spanned, SyntaxContext, DUMMY_SP};
use swc_core::ecma::{
    ast::*,
    transforms::testing::test_inline,
    visit::{VisitMut, VisitMutWith},
};
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

pub struct TransformVisitor {
    has_define_event_import: bool,
    has_register_event_import: bool,
}

impl Default for TransformVisitor {
    fn default() -> Self {
        Self {
            has_define_event_import: false,
            has_register_event_import: false,
        }
    }
}

impl VisitMut for TransformVisitor {
    fn visit_mut_module(&mut self, module: &mut Module) {
        // First pass: collect imports
        for item in &module.body {
            if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item {
                self.analyze_import(import);
            }
        }

        // Second pass: transform the module
        module.visit_mut_children_with(self);

        // Third pass: add registerEvent import if needed
        if self.has_define_event_import && !self.has_register_event_import {
            self.add_register_event_import(&mut module.body);
        }
    }

    fn visit_mut_module_items(&mut self, items: &mut Vec<ModuleItem>) {
        let mut new_items = Vec::new();

        for item in items.drain(..) {
            new_items.push(item.clone());

            // Check if this item contains a defineEvent call
            if let ModuleItem::Stmt(Stmt::Decl(Decl::Var(ref var_decl))) = item {
                if self.has_define_event_import {
                    for declarator in &var_decl.decls {
                        if let (Pat::Ident(BindingIdent { id, .. }), Some(init_expr)) =
                            (&declarator.name, &declarator.init)
                        {
                            if self.is_define_event_call(init_expr) {
                                let register_call = self.create_register_event_call(
                                    id.sym.to_string(),
                                    init_expr.span(),
                                );
                                new_items.push(ModuleItem::Stmt(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(register_call),
                                })));
                            }
                        }
                    }
                }
            }
        }

        *items = new_items;
    }
}

impl TransformVisitor {
    fn analyze_import(&mut self, import: &ImportDecl) {
        let Str { value, .. } = &*import.src;
        if value == "evw" {
            // Check if defineEvent is imported
            for spec in &import.specifiers {
                if let ImportSpecifier::Named(ImportNamedSpecifier {
                    local, imported, ..
                }) = spec
                {
                    let import_name = match imported {
                        Some(ModuleExportName::Ident(ident)) => &ident.sym,
                        _ => &local.sym,
                    };
                    if import_name == "defineEvent" {
                        self.has_define_event_import = true;
                    }
                }
            }
        } else if value == "evw/ipc" {
            // Check if registerEvent is already imported
            for spec in &import.specifiers {
                if let ImportSpecifier::Named(ImportNamedSpecifier {
                    local, imported, ..
                }) = spec
                {
                    let import_name = match imported {
                        Some(ModuleExportName::Ident(ident)) => &ident.sym,
                        _ => &local.sym,
                    };
                    if import_name == "registerEvent" {
                        self.has_register_event_import = true;
                    }
                }
            }
        }
    }

    fn is_define_event_call(&self, expr: &Expr) -> bool {
        match expr {
            Expr::Call(CallExpr {
                callee: Callee::Expr(callee_expr),
                ..
            }) => match &**callee_expr {
                Expr::Ident(ident) => ident.sym == "defineEvent",
                _ => false,
            },
            _ => false,
        }
    }

    fn add_register_event_import(&mut self, body: &mut Vec<ModuleItem>) {
        let import_decl = ImportDecl {
            span: DUMMY_SP,
            specifiers: vec![ImportSpecifier::Named(ImportNamedSpecifier {
                span: DUMMY_SP,
                local: Ident::new("registerEvent".into(), DUMMY_SP, SyntaxContext::empty()),
                imported: None,
                is_type_only: false,
            })],
            src: Box::new(Str {
                span: DUMMY_SP,
                value: "evw/ipc".into(),
                raw: Some("'evw/ipc'".into()),
            }),
            type_only: false,
            with: None,
            phase: Default::default(),
        };

        body.insert(0, ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl)));
    }

    fn create_register_event_call(&self, event_var: String, span: Span) -> Expr {
        let line = span.lo.0;
        let col = span.hi.0;

        Expr::Call(CallExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            callee: Callee::Expr(Box::new(Expr::Ident(Ident::new(
                "registerEvent".into(),
                DUMMY_SP,
                SyntaxContext::empty(),
            )))),
            args: vec![
                // First argument: the event variable
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Ident(Ident::new(
                        event_var.into(),
                        DUMMY_SP,
                        SyntaxContext::empty(),
                    ))),
                },
                // Second argument: __filename
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Ident(Ident::new(
                        "__filename".into(),
                        DUMMY_SP,
                        SyntaxContext::empty(),
                    ))),
                },
                // Third argument: line number as string
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Lit(Lit::Str(Str {
                        span: DUMMY_SP,
                        value: line.to_string().into(),
                        raw: None,
                    }))),
                },
                // Fourth argument: column number as string
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Lit(Lit::Str(Str {
                        span: DUMMY_SP,
                        value: col.to_string().into(),
                        raw: None,
                    }))),
                },
            ],
            type_args: None,
        })
    }
}

/// Plugin transform function that detects defineEvent calls and automatically
/// adds registerEvent calls with metadata for cross-runtime event sharing.
#[plugin_transform]
pub fn process_transform(
    mut program: Program,
    _metadata: TransformPluginProgramMetadata,
) -> Program {
    program.visit_mut_with(&mut TransformVisitor::default());
    program
}

// Test the plugin transform
test_inline!(
    Default::default(),
    |_| swc_core::ecma::visit::visit_mut_pass(TransformVisitor::default()),
    define_event_transform,
    r#"
import { defineEvent } from 'evw';

const startEvent = defineEvent();
const endEvent = defineEvent();
"#,
    r#"
import { registerEvent } from "evw/ipc";
import { defineEvent } from 'evw';

const startEvent = defineEvent();
registerEvent(startEvent, __filename, "57", "70");
const endEvent = defineEvent();
registerEvent(endEvent, __filename, "89", "102");
"#
);
