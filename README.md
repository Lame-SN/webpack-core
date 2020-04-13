## webpack-core

 实现Webpack的核心功能
- 读取文件代码，将代码用Node的fs模块解析成utf-8的string
- 使用bable/parser将源码转成AST
- 使用bable/traverse 遍历AST，找到需要处理的节点进行操作，收集依赖
- 最后使用IIFE的方式处理模块，生成bundle.js
