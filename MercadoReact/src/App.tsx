import { useState } from 'react'

const EMOJIS = [
  '🛒','🍎','🍌','🥛','🧀','🥖','🍇','🍉','🥕','🥦',
  '🍗','🥩','🍔','🍟','🧃','🥫','🍪','🍫','🛍️','📦',
  '🥚','🍞','🥤','🍓','🍍','🥒','🍅','🧄','🧅','🥔',
]

const POSITIONS = [
  { top: '10%', left: '5%', dur: 18 }, { top: '30%', left: '20%', dur: 25 },
  { top: '70%', left: '15%', dur: 21 }, { top: '50%', left: '40%', dur: 18 },
  { top: '80%', left: '60%', dur: 25 }, { top: '20%', left: '75%', dur: 21 },
  { top: '60%', left: '85%', dur: 18 }, { top: '40%', left: '10%', dur: 25 },
  { top: '15%', left: '50%', dur: 21 }, { top: '85%', left: '30%', dur: 18 },
  { top: '55%', left: '70%', dur: 25 }, { top: '35%', left: '90%', dur: 21 },
  { top: '75%', left: '45%', dur: 18 }, { top: '5%', left: '80%', dur: 25 },
  { top: '65%', left: '25%', dur: 21 }, { top: '45%', left: '55%', dur: 18 },
  { top: '25%', left: '35%', dur: 25 }, { top: '90%', left: '75%', dur: 21 },
  { top: '10%', left: '60%', dur: 18 }, { top: '50%', left: '5%', dur: 25 },
  { top: '70%', left: '80%', dur: 21 }, { top: '20%', left: '30%', dur: 18 },
  { top: '85%', left: '55%', dur: 25 }, { top: '35%', left: '65%', dur: 21 },
  { top: '15%', left: '85%', dur: 18 }, { top: '65%', left: '50%', dur: 25 },
  { top: '45%', left: '80%', dur: 21 }, { top: '75%', left: '10%', dur: 18 },
  { top: '25%', left: '90%', dur: 25 }, { top: '90%', left: '40%', dur: 21 },
]

type Page = 'home' | 'cadastro' | 'admin' | 'cliente'
type Portal = 'admin' | 'cadastro' | 'cliente' | null

function Background() {
  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0,
    }}>
      {POSITIONS.map((pos, i) => (
        <span
          key={i}
          className="emoji-float"
          style={{
            top: pos.top,
            left: pos.left,
            animationDuration: `${pos.dur}s`,
            animationDelay: `${(i * 0.7) % 5}s`,
          }}
        >
          {EMOJIS[i % EMOJIS.length]}
        </span>
      ))}
    </div>
  )
}

function Header({ onBack, showBack }: { onBack?: () => void; showBack?: boolean }) {
  return (
    <header style={{
      position: 'relative', zIndex: 10, width: '100%',
      padding: '18px 20px',
      background: 'rgba(0, 35, 15, 0.92)',
      color: 'white',
      fontSize: '20px',
      fontWeight: 'bold',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      textAlign: 'center',
    }}>
      {showBack && (
        <button
          onClick={onBack}
          aria-label="Voltar"
          style={{
            position: 'absolute',
            left: '20px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ←
        </button>
      )}
      <span style={{ fontSize: '22px' }}>🛒</span>
      <span>Sistema de Gerenciamento de Mercado — KLP.NUNES</span>
    </header>
  )
}

function Footer() {
  return (
    <footer style={{
      position: 'relative',
      zIndex: 10,
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '6px',
      padding: '12px 28px',
      background: 'rgba(0, 25, 10, 0.94)',
      color: 'white',
      fontSize: '13px',
      backdropFilter: 'blur(8px)',
    }}>
      <span>🏫 Cedup Diomicio Freitas</span>
      <span>📚 Turma: 301 — Internet</span>
      <span>👥 Dennis, Kauan, Ladson e Patrick</span>
    </footer>
  )
}

const pageStyle = {
  minHeight: '100vh',
  display: 'flex' as const,
  flexDirection: 'column' as const,
  background: 'linear-gradient(150deg, #0d4a1f 0%, #126b2c 35%, #1a7a35 65%, #27ae60 100%)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
  fontFamily: 'Arial, sans-serif',
}

// ─── Home ────────────────────────────────────────────────────────────────────

function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [hovered, setHovered] = useState<Portal>(null)

  return (
    <div style={pageStyle}>
      <Background />
      <Header />
      <main style={{
        position: 'relative',
        zIndex: 5,
        flex: 1,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px 20px',
      }}>
        <div style={{
          position: 'relative',
          zIndex: 6,
          width: '100%',
          maxWidth: '420px',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          background: 'rgba(245, 230, 211, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 5px 20px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontSize: '52px', lineHeight: 1 }}>🛒</div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1a1a1a',
              margin: 0,
            }}>
              Área Inicial
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#555',
              marginTop: '6px',
            }}>
              Selecione como deseja acessar o sistema
            </p>
          </div>

          <PortalCard
            id="cadastro"
            emoji="📋"
            label="Cadastro"
            description="Criar nova conta"
            color="#27ae60"
            hoverColor="#2ecc71"
            isHovered={hovered === 'cadastro'}
            onHover={setHovered}
            onClick={() => onNavigate('cadastro')}
            fullWidth
          />

          <div style={{
            width: '100%',
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <PortalCard
              id="admin"
              emoji="🔒"
              label="Administrador"
              description="Acesso de gestão"
              color="#2c3e50"
              hoverColor="#34495e"
              isHovered={hovered === 'admin'}
              onHover={setHovered}
              onClick={() => onNavigate('admin')}
            />
            <PortalCard
              id="cliente"
              emoji="👤"
              label="Cliente"
              description="Minha conta"
              color="#3498db"
              hoverColor="#2980b9"
              isHovered={hovered === 'cliente'}
              onHover={setHovered}
              onClick={() => onNavigate('cliente')}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// ─── Cadastro ────────────────────────────────────────────────────────────────

type CadastroForm = { nome: string; email: string; cpf: string; telefone: string; senha: string; confirmar: string }

function CadastroPage({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<CadastroForm>({ nome: '', email: '', cpf: '', telefone: '', senha: '', confirmar: '' })
  const [showSenha, setShowSenha] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<CadastroForm>>({})

  const validate = () => {
    const e: Partial<CadastroForm> = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (!form.email.includes('@')) e.email = 'E-mail inválido'
    if (form.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'CPF inválido (11 dígitos)'
    if (form.senha.length < 6) e.senha = 'Mínimo 6 caracteres'
    if (form.senha !== form.confirmar) e.confirmar = 'Senhas não coincidem'
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setSubmitted(true)
  }

  const field = (key: keyof CadastroForm, label: string, type = 'text', placeholder = '') => (
    <div style={{ width: '100%' }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#2c3e50', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type={key === 'senha' || key === 'confirmar' ? (showSenha ? 'text' : 'password') : type}
        value={form[key]}
        onChange={ev => setForm(f => ({ ...f, [key]: ev.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '11px 14px',
          borderRadius: '10px',
          border: errors[key] ? '2px solid #e74c3c' : '2px solid rgba(44,62,80,0.15)',
          fontSize: '0.95rem',
          fontFamily: "'Nunito', sans-serif",
          background: 'white',
          outline: 'none',
          transition: 'border 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={ev => { ev.target.style.border = '2px solid #27ae60' }}
        onBlur={ev => { ev.target.style.border = errors[key] ? '2px solid #e74c3c' : '2px solid rgba(44,62,80,0.15)' }}
      />
      {errors[key] && <span style={{ fontSize: '0.75rem', color: '#e74c3c', marginTop: '3px', display: 'block' }}>{errors[key]}</span>}
    </div>
  )

  return (
    <div style={pageStyle}>
      <Background />
      <Header onBack={onBack} showBack />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', zIndex: 10, position: 'relative' }}>
        <div style={{
          background: 'rgba(245, 230, 211, 0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: '28px',
          padding: '40px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.4)',
          maxWidth: '480px',
          width: '100%',
        }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a4d2a', margin: '0 0 8px' }}>Cadastro realizado!</h2>
              <p style={{ color: '#5a7a63', fontWeight: 600, marginBottom: '28px' }}>
                Bem-vindo(a), <strong>{form.nome.split(' ')[0]}</strong>! Sua conta foi criada com sucesso.
              </p>
              <button
                onClick={onBack}
                style={{
                  background: '#27ae60', color: 'white', border: 'none',
                  borderRadius: '12px', padding: '13px 32px',
                  fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Ir para a Área Inicial
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>📝</div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1a4d2a', margin: 0 }}>Criar Conta</h2>
                <p style={{ color: '#5a7a63', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
                  Preencha os dados para se cadastrar
                </p>
              </div>

              {field('nome', 'Nome Completo', 'text', 'Ex: João da Silva')}
              {field('email', 'E-mail', 'email', 'seuemail@exemplo.com')}

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>{field('cpf', 'CPF', 'text', '000.000.000-00')}</div>
                <div style={{ flex: 1 }}>{field('telefone', 'Telefone', 'tel', '(00) 90000-0000')}</div>
              </div>

              {field('senha', 'Senha', 'password', 'Mínimo 6 caracteres')}
              {field('confirmar', 'Confirmar Senha', 'password', 'Repita a senha')}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px' }}>
                <input
                  type="checkbox"
                  id="showpwd"
                  checked={showSenha}
                  onChange={e => setShowSenha(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="showpwd" style={{ fontSize: '0.82rem', color: '#5a7a63', cursor: 'pointer', fontWeight: 600 }}>
                  Mostrar senha
                </label>
              </div>

              <button
                type="submit"
                style={{
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: '4px',
                  fontFamily: "'Nunito', sans-serif",
                  transition: 'background 0.2s',
                  width: '100%',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e8449')}
                onMouseLeave={e => (e.currentTarget.style.background = '#27ae60')}
              >
                Criar Conta
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#5a7a63', fontWeight: 600, margin: 0 }}>
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={onBack}
                  style={{ background: 'none', border: 'none', color: '#27ae60', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Nunito', sans-serif", padding: 0 }}
                >
                  Voltar ao início
                </button>
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

// ─── Login genérico (Admin / Cliente) ────────────────────────────────────────

function LoginPage({ type, onBack }: { type: 'admin' | 'cliente'; onBack: () => void }) {
  const isAdmin = type === 'admin'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@') || senha.length < 4) {
      setError('E-mail ou senha inválidos.')
      return
    }
    setError('')
    setLoggedIn(true)
  }

  const color = isAdmin ? '#2c3e50' : '#3498db'
  const hoverColor = isAdmin ? '#1a252f' : '#1a6fa8'
  const emoji = isAdmin ? '🔐' : '👤'
  const label = isAdmin ? 'Administrador' : 'Cliente'

  return (
    <div style={pageStyle}>
      <Background />
      <Header onBack={onBack} showBack />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', zIndex: 10, position: 'relative' }}>
        <div style={{
          background: 'rgba(245, 230, 211, 0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: '28px',
          padding: '44px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.4)',
          maxWidth: '420px',
          width: '100%',
        }}>
          {loggedIn ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>{emoji}</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a4d2a', margin: '0 0 8px' }}>
                Acesso realizado!
              </h2>
              <p style={{ color: '#5a7a63', fontWeight: 600, marginBottom: '28px' }}>
                Bem-vindo(a) ao painel de <strong>{label}</strong>.
              </p>
              <button
                onClick={onBack}
                style={{
                  background: color, color: 'white', border: 'none',
                  borderRadius: '12px', padding: '13px 32px',
                  fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Voltar ao Início
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{emoji}</div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1a4d2a', margin: 0 }}>
                  Entrar como {label}
                </h2>
                <p style={{ color: '#5a7a63', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
                  Insira suas credenciais para continuar
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#2c3e50', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                    border: '2px solid rgba(44,62,80,0.15)', fontSize: '0.95rem',
                    fontFamily: "'Nunito', sans-serif", background: 'white', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.border = `2px solid ${color}`)}
                  onBlur={e => (e.target.style.border = '2px solid rgba(44,62,80,0.15)')}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#2c3e50', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    style={{
                      width: '100%', padding: '11px 44px 11px 14px', borderRadius: '10px',
                      border: '2px solid rgba(44,62,80,0.15)', fontSize: '0.95rem',
                      fontFamily: "'Nunito', sans-serif", background: 'white', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.border = `2px solid ${color}`)}
                    onBlur={e => (e.target.style.border = '2px solid rgba(44,62,80,0.15)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(s => !s)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem',
                    }}
                  >
                    {showSenha ? '🙈' : '👁️'}
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: '5px' }}>
                  <button type="button" style={{ background: 'none', border: 'none', color, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', fontFamily: "'Nunito', sans-serif" }}>
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: '#fdecea', border: '1px solid #e74c3c', borderRadius: '8px', padding: '10px 14px', color: '#c0392b', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: color, color: 'white', border: 'none',
                  borderRadius: '12px', padding: '14px',
                  fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif", transition: 'background 0.2s', width: '100%',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = hoverColor)}
                onMouseLeave={e => (e.currentTarget.style.background = color)}
              >
                Entrar
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#5a7a63', fontWeight: 600, margin: 0 }}>
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={onBack}
                  style={{ background: 'none', border: 'none', color: '#27ae60', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Nunito', sans-serif", padding: 0 }}
                >
                  Criar conta grátis
                </button>
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>('home')

  if (page === 'cadastro') return <CadastroPage onBack={() => setPage('home')} />
  if (page === 'admin')    return <LoginPage type="admin"   onBack={() => setPage('home')} />
  if (page === 'cliente')  return <LoginPage type="cliente" onBack={() => setPage('home')} />
  return <HomePage onNavigate={setPage} />
}

// ─── PortalCard ───────────────────────────────────────────────────────────────

type PortalCardProps = {
  id: Portal
  emoji: string
  label: string
  description: string
  color: string
  hoverColor: string
  isHovered: boolean
  onHover: (id: Portal) => void
  onClick: () => void
  fullWidth?: boolean
}

function PortalCard({ id, emoji, label, description, color, hoverColor, isHovered, onHover, onClick, fullWidth }: PortalCardProps) {
  return (
    <button
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      style={{
        flex: fullWidth ? undefined : '1 1 0',
        width: fullWidth ? '100%' : undefined,
        minWidth: fullWidth ? undefined : '120px',
        background: isHovered ? hoverColor : color,
        color: 'white',
        border: 'none',
        borderRadius: '16px',
        padding: fullWidth ? '18px 24px' : '20px 16px',
        cursor: 'pointer',
        transition: 'all 0.22s ease',
        transform: isHovered ? 'scale(1.04) translateY(-2px)' : 'scale(1)',
        boxShadow: isHovered ? `0 10px 30px ${color}55` : `0 4px 14px ${color}33`,
        display: 'flex',
        alignItems: 'center',
        gap: fullWidth ? '14px' : undefined,
        flexDirection: fullWidth ? 'row' : 'column',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <span style={{ fontSize: fullWidth ? '1.8rem' : '2rem' }}>{emoji}</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: fullWidth ? '1.15rem' : '1rem', lineHeight: 1.2 }}>
          {label}
        </div>
        <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 600, marginTop: '2px' }}>
          {description}
        </div>
      </div>
    </button>
  )
}
