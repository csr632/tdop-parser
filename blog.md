#! https://zhuanlan.zhihu.com/p/471075848
# 手写一个Parser - 代码简单而功能强大的Pratt Parsing

在编译的流程中，一个很重要的步骤是语法分析（又称解析，Parsing）。解析器（Parser）负责将Token流转化为抽象语法树（AST）。这篇文章介绍一种Parser的实现算法：Pratt Parsing，又称Top Down Operator Precedence Parsing，并[用TypeScript来实现它](https://github.com/csr632/tdop-parser)。

> Pratt Parsing实现起来非常简单，你可以看一下[TypeScript实现结果](https://github.com/csr632/tdop-parser/blob/main/src/parser.ts)，核心代码不到40行！

## 应用背景

实现一个解析器的方式一般有2种：

- 使用Parser generator
- 手工实现

### Parser generator

使用Parser generator。用一种DSL（比如BNF）来描述你的语法，将描述文件输入给Parser generator，后者就会输出一份用来解析这种语法的代码。

这种方式非常方便，足以满足绝大部分的需求。但是在一些场景下，它不够灵活（比如无法提供更有用的、包含上下文的错误信息）、性能不够好、生成代码较长。并且，在描述**表达式的操作符优先级(precedence)和结合性(associativity)**的时候，语法描述会变得非常复杂、难以阅读，比如[wikipedia的例子](https://en.wikipedia.org/wiki/Operator-precedence_parser#Precedence_climbing_method)：

```
expression ::= equality-expression
equality-expression ::= additive-expression ( ( '==' | '!=' ) additive-expression ) *
additive-expression ::= multiplicative-expression ( ( '+' | '-' ) multiplicative-expression ) *
multiplicative-expression ::= primary ( ( '*' | '/' ) primary ) *
primary ::= '(' expression ')' | NUMBER | VARIABLE | '-' primary
```

你需要为每一种优先级创建一个规则，导致表达式的语法描述非常复杂。

因此有时候需要用第二种方式：手工实现。

### 手工实现

#### 递归下降算法

手工实现Parser的常见方法是**[递归下降算法](https://en.wikipedia.org/wiki/Recursive_descent_parser)** 。递归下降算法比较擅长解析的是**[语句(Statement)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements)** ，因为创造者在设计语句的时候，有意地将语句类型的标识放在最开头，比如`if (expression) ...`、`while (expression) ...`。得益于此，Parser通过开头来识别出语句类型以后，就知道需要依次解析哪些结构了，依次调用对应的结构解析函数即可，实现非常简单。

但是，递归下降算法在处理**[表达式(Expression)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators)** 的时候非常**吃力**，因为Parser在读到表达式开头的时候，无法知道正在解析哪种表达式，因为操作符(Operator)往往在表达式的中间位置（甚至结尾），比如加法运算的`+`、函数调用的`()`。并且，你需要为每一种**操作符优先级(precedence)**都单独编写一个解析函数，并手动处理**结合性(associativity)**，因此解析函数会比较多、比较复杂。

比如在[wikipedia的例子](https://en.wikipedia.org/wiki/Recursive_descent_parser#C_implementation)中，`expression`负责处理加减法、`term`负责处理乘除法，并且前者调用后者。可以想象有更多优先级时，代码会更加复杂，递归调用层级会更深。比如，即使输入字符串是简单的`1`，这个解析器也需要递归地调用以下解析函数：`program -> block -> statement -> expression -> term -> factor` 。后面2层调用本应该避免，因为输入根本不包含加减乘除法！

因此，在手工实现Parser的时候，一般会**将表达式的解析交给其它算法**，规避递归下降的劣势。Pratt Parsing就是这样一种擅长解析表达式的算法。

#### Pratt Parsing

Pratt Parsing，又称Top Down Operator Precedence Parsing，是一种很巧妙的算法，它实现简单、性能好，而且很容易定制扩展，**尤其擅长解析表达式**，擅长处理表达式操作符**优先级(precedence)**和**结合性(associativity)**。

## 算法介绍

### 概念介绍

Pratt Parsing将token分成2种：

- prefix (正规术语是nud)。如果一个token可以放在表达式的最开头，那么它就是一个"prefix"。比如 `123` 、`(`，或者表示负数的`-`。以这种token为中心，构建表达式节点时，不需要知道这个token左边的表达式。它们构建出来的表达式节点类似于这样：

```ts
// 负数的负号前缀
// 不需要知道它左边的表达式
{
  type: "unary",
  operator: "-",
  body: rightExpression,
}
```

- infix (正规术语是led)。如果一个token在构建表达式节点的时候，**必须知道它左边的子表达式**，那么它就是一个"infix"。这意味着infix不能放在任何表达式的开头。比如加减乘除法操作符。它们构建出来的表达式节点类似于这样：

```ts
// 减法操作符
// 需要提前解析好它左边的表达式，得到leftExpression，才能构建减法节点
{
  type: "binary",
  operator: "-",
  left: leftExpression,
  right: rightExpression,
}
```

注意，虽然`-`既可以是prefix又可以是infix，但实际上，**你在从左到右读取输入字符串的时候，你是可以立即判断出你遇到的`-`应该当作prefix还是infix的，不用担心混淆 （比如`-1-2`）**。在理解了下面的算法以后，你会更明白这一点。

### 代码讲解

Pratt Parsing算法的核心实现就是[parseExp函数](https://github.com/csr632/tdop-parser/blob/23754a4a1eb15cb40de0cfd5a31fb1a43a55a87c/src/parser.ts#L19)：

```ts
/*  1 */ function parseExp(ctxPrecedence: number): Node {
/*  2 */   let prefixToken = scanner.consume();
/*  3 */   if (!prefixToken) throw new Error(`expect token but found none`);
/*  4 */ 
/*  5 */   // because our scanner is so naive,
/*  6 */   // we treat all non-operator tokens as value (.e.g number)
/*  7 */   const prefixParselet =
/*  8 */     prefixParselets[prefixToken] ?? prefixParselets.__value;
/*  9 */   let left: Node = prefixParselet.handle(prefixToken, parser);
/* 10 */
/* 11 */   while (true) {
/* 12 */     const infixToken = scanner.peek();
/* 13 */     if (!infixToken) break;
/* 14 */     const infixParselet = infixParselets[infixToken];
/* 15 */     if (!infixParselet) break;
/* 16 */     if (infixParselet.precedence <= ctxPrecedence) break;
/* 17 */     scanner.consume();
/* 18 */     left = infixParselet.handle(left, infixToken, parser);
/* 19 */   }
/* 20 */   return left;
/* 21 */ }
```

下面我们逐行讲解这个算法的工作原理。

#### 2~10行：解析prefix

首先，这个方法会从token流**吃掉**一个token。这个token**必定**是一个prefix （比如遇到`-`要将它理解为prefix）。

> 注意，consume表示吃掉，peek表示瞥一眼。

在第7行，我们找到这个prefix对应的表达式构建器（prefixParselet），并调用它。prefixParselet的作用是，构建出以这个prefix为中心的表达式节点。

我们先假设简单的情况，假设第一个token是`123`。它会触发[默认的prefixParselet](https://github.com/csr632/tdop-parser/blob/9ae9c8c4c18126f3ae046da8131dc213c8d839c2/src/parselet.ts#L13)(`prefixParselets.__value`)，直接返回一个value节点：

```ts
{
  type: "value",
  value: "123",
}
```
它就是我们在第9行赋值给`left`的值（已经构建好的表达式节点）。

在更复杂的情况下，**prefixParselet会递归调用`parseExp`**。比如，负号`-`的prefixParselets是这样注册的：

```ts
// 负号前缀的优先级定为150，它的作用在后面讲述
prefixParselets["-"] = {
  handle(token, parser) {
    const body = parser.parseExp(150);
    return {
      type: "unary",
      operator: "-",
      body,
    };
  },
};
```

它会递归调用parseExp，将它右边的表达式节点解析出来，作为自己的body。
> 注意，它完全不关心自己左边的表达式是什么，这是prefix的根本特征。

在这里，递归调用`parseExp(150)`传递的参数150，可以理解成**它与右边子表达式的绑定强度**。举个例子，在解析`-1+2`的时候，prefix `-` 调用`parseExp(150)`得到的body是`1`，而不是`1+2`，这就要归功于150这个参数。优先级的具体机理在后面还会讲述。

#### 11~19行：解析infix

得到了prefix的表达式节点以后，我们就进入了一个while循环，这个循环负责解析出后续的infix操作。比如`-1 + 2 + 3 + 4`，后面3个加号都会在这个循环中解析出来。

它先从token流**瞥见**一个token，作为infix，找到它对应的表达式构建器（infixParselet），调用`infixParselet.handle`，得到新的表达式节点。注意，**调用infixParselet时传入了当前的`left`**，因为infix需要它左边的表达式节点才能构建自己。新的表达式节点又会赋值给`left`。`left`不断累积，变成更大的节点树。

比如，`-`的infixParselet是这样注册的：

```ts
// 加减法的优先级定义为120
infixParselets["-"] = {
  precedence: 120,
  handle(left, token, parser) {
    const right = parser.parseExp(120);
    return {
      type: "binary",
      operator: "-",
      left,
      right,
    };
  },
};
```

类似于prefixParselet，它也会递归调用parseExp来解析右边的表达式节点。不同之处在于，它本身还有一个可读取的`precedence`属性，以及它在构建表达式节点时使用了`left`参数。

继续往下，理解13~16行的3个判断，是理解整个算法的关键。

第一个判断 `if (!infixToken) break;` 很好理解，说明已经读到输入末尾，解析自然就要结束。

第二个判断 `if (!infixParselet) break;`也比较好理解，说明遇到了非中缀操作符，可能是因为输入有错误语法，也可能是遇到了`)`或者`;`，需要将当前解析出来的表达式节点返回给调用者来处理。

第三个判断`if (infixParselet.precedence <= ctxPrecedence) break;`是整个算法的核心，前面提到的parseExp的参数`ctxPrecedence`，就是为这一行而存在的。它的作用是，**限制本次parseExp调用只能解析优先级大于`ctxPrecedence`的infix操作符**。如果遇到的infix优先级小于等于`ctxPrecedence`，则停止解析，将当前解析结果返回给调用者，让调用者来处理后续token。**初始时`ctxPrecedence`的值为0**，表示要解析完所有操作，直到遇到结尾（或遇到不认识的操作符）。

比如，在前面`-1+2`的例子中，前缀`-`的prefixParselet递归调用了`parseExp(150)`，在递归的parseExp执行中，`ctxPrecedence`为150，大于 `+`infix的优先级 `120`，因此这个递归调用遇到`+`的时候就结束了，使得前缀`-`与`1`绑定，而不是与`1+2`绑定。这样，才能得到正确的结果`(-(1))+2`。
> 在infixParselet递归调用parseExp的时候，也同样传入了这个参数。

你可以将prefixParselet和infixParselet递归调用parseExp的行为，理解成**用一个“磁铁”来吸引后续的token，递归参数`ctxPrecedence`就表示这个磁铁的“吸力”**。仅仅当后续infix与它左边的token结合的足够紧密（infixParselet.precedence足够大）时，这个infix才会一起被“吸”过来。否则，这个infix会与它左边的token“分离”，它左边的token会参与本次parseExp构建表达式节点的过程，而这个infix不会参与。

### 算法总结

综上所述，**Pratt Parsing是一种循环与递归相结合的算法**。`parseExp`的执行结构大概是这样：

- 吃一个token作为prefix，调用它的prefixParselet，得到`left`（已经构建好的表达式节点）
  - prefixParselet**递归调用parseExp**，解析自己需要的部分，构建表达式节点
- **while循环**
  - 瞥一眼token作为infix，仅当它的优先级足够高，才能继续处理。否则跳出循环
  - 吃掉infix token，调用它的infixParselet，将`left`传给它
    - infixParselet**递归调用parseExp**，解析自己需要的部分，构建表达式节点
  - 得到新的`left`
- `return left`

现在，你应该能够理解前面所说的“你在从左到右读取输入字符串的时候，你是可以立即判断出你遇到的`-`应该当作prefix还是infix的，不用担心混淆 （比如`-1-2`）”，因为在读取下一个token之前，算法就已经很清楚接下来的token应该**作为**prefix还是infix！

Pratt Parsing的精妙之处在于，在看到最开头的原子表达式以后，就可以直接构建出它对应的节点，**不需要知道它如何身处于更高层级的表达式结构中**。如果扫描到后面发现，左边的表达式属于某个infix，再将它交给infix的处理函数，构建出更高层级的表达式。也就是说，**Pratt Parsing从表达式树的叶子节点开始构建，然后根据后续扫描的结果，将它放置在合适的上下文（更高层级的表达式结构）中。这就是它如此擅长处理表达式的根本原因**。
> 与之形成对比的是，前面提到的递归下降算法，它需要自顶向下地理解表达式结构：`program -> block -> statement -> expression -> term -> factor`。

#### 示例的执行过程

现在，用`1 + 2 * 3 - 4`作为例子，理解Pratt Parsing算法的执行过程：

- 先定义好每个infix的优先级（即`infixParselet.precedence`）：比如，加减法为120，乘除法为130 （乘除法的“绑定强度”更高）
- 初始时调用`parseExp(0)`，即`ctxPrecedence=0`
  - **吃**掉一个token `1`，调用prefixParselet，得到表达式节点 `1` ，赋值给`left`
  - 进入while循环，瞥见`+`，找到它的infixParselet，优先级为120，大于ctxPrecedence。因此这个infix也一起被“吸走”
  - **吃**掉`+`，调用`+`的infixParselet.handle，此时`left`为`1`
    - `+`的infixParselet.handle 递归调用`parser.parseExp(120)`，即`ctxPrecedence=120`
    - **吃**掉一个token `2`，调用prefixParselet，得到表达式节点`2`，赋值给`left`
    - 进入while循环，瞥见`*`，找到它的infixParselet，优先级为130，大于ctxPrecedence。因此这个infix也一起被“吸走”
    - **吃**掉`*`，调用`*`的infixParselet.handle，此时`left`为`2`
      - `*`的infixParselet.handle递归调用`parser.parseExp(130)`，即`ctxPrecedence=130`
      - **吃**掉一个token `3`，调用prefixParselet，得到表达式节点`3`，赋值给`left`
      - 进入while循环，瞥见`-`，找到它的infixParselet，优先级为120，**不**大于ctxPrecedence，因此这个infix不会被一起吸走，while循环结束
      - `parser.parseExp(130)`返回 `3`
    - `*`的infixParselet.handle返回`2 * 3` （将`parser.parseExp`的返回值与`left`拼起来），赋值给`left`
    - 继续while循环，瞥见`-`，找到它的infixParselet，优先级为120，**不**大于ctxPrecedence。因此这个infix不会被一起吸走，while循环结束
    - `parser.parseExp(120)`返回子表达式 `2 * 3`
  - `+`的 infixParselet.handle返回`1+(2*3)`（将`parser.parseExp`的返回值与`left`拼起来），赋值给`left`
  - 继续while循环，瞥见`-`，找到它的infixParselet，优先级为120，大于ctxPrecedence。因此这个infix也一起被“吸走”
  - **吃**掉`-`，调用`-`的infixParselet.handle，此时`left`为`1+(2*3)`
  - 与之前同理，`-`的 infixParselet.handle的返回结果为`(1+(2*3))-4`（将`parser.parseExp`的返回值与`left`拼起来），赋值给`left`
  - while循环继续，但是发现后面没有token，因此退出while循环，返回`left`
- `parseExp(0)`返回`(1+(2*3))-4`

#### 如何处理结合性

操作符的[结合性(associativity)](https://en.wikipedia.org/wiki/Operator_associativity)，是指，当表达式出现多个**连续的**、**相同优先级的**操作符时，是左边的操作符优先结合(left-associative)，还是右边的优先结合(right-associative)。

根据上面描述的算法，`1+1+1+1`是左结合的，也就是说，它会被解析成`((1+1)+1)+1`，这符合我们的预期。

但是，有一些操作符是右结合的，比如赋值符号`=`(比如`a = b = 1`应该被解析成`a = (b = 1)`)、取幂符号`^`(比如`a^b^c`应该被解析成`a^(b^c)`)。
> 在这里，我们使用`^`作为取幂符号，而不是像Javascript一样使用`**`，是为了避免一个操作符恰好是另一个操作符的前缀，引发当前实现的缺陷：遇到`**`的第一个字符就急切地识别成乘法。实际上这个缺陷很好修复，你能尝试提一个PR吗？

如何实现这种右结合的操作符呢？[答案只需要一行](https://github.com/csr632/tdop-parser/blob/0dd8a67c93de7644439d237baa68c4f16a64f314/src/parselet.ts#L61)：在infixParselet中，递归调用`parseExp`时，传递一个稍小一点的ctxPrecedence。这是我们用于注册infix的工具函数：

```ts
function helpCreateInfixOperator(
  infix: string,
  precedence: number,
  associateRight2Left: boolean = false
) {
  infixParselets[infix] = {
    precedence,
    handle(left, token, { parseExp }) {
      const right = parseExp(associateRight2Left ? precedence - 1 : precedence);
      return {
        type: "binary",
        operator: infix,
        left,
        right,
      };
    },
  };
}
```

这样，递归`parseExp`的“吸力”就弱了一些，在遇到相同优先级的操作符时，右边的操作符结合得更加紧密，因此也被一起“吸”了过来（而没有分离）。

## 完整实现

[完整实现的Github仓库](https://github.com/csr632/tdop-parser)。它包含了测试（覆盖率100%），以及更多的操作符实现（比如括号、函数调用、分支操作符`...?...:...` 、右结合的幂操作符`^`等）。

## 参考资料

- [How Desmos uses Pratt Parsers](https://engineering.desmos.com/articles/pratt-parser/) 这篇文章引导读者从零开始推导出Pratt算法，并给出了他们选择Pratt Parsing时的权衡。
- [Pratt Parsers: Expression Parsing Made Easy](http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/) 也是一篇很不错的介绍文章，将读者带入Pratt算法的推导过程。
- [Arrow functions break JavaScript parsers](https://dev.to/samthor/arrow-functions-break-javascript-parsers-1ldp) 带领我们思考一个很有意思的问题：JavaScript的箭头函数`(arg1=...)=>{...}`是如何解析的？可能比你想象中的要难！
