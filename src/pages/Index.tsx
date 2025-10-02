import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Users, 
  BarChart3, 
  Clock, 
  Play, 
  CheckCircle, 
  Star, 
  ArrowRight, 
  Zap, 
  Shield, 
  Target,
  TrendingUp,
  MessageSquare,
  FileText,
  Calendar,
  Award,
  Globe,
  Mail,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [stats, setStats] = useState({ leads: 0, calls: 0, time: 0, teams: 0 });

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Animate stats on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({ leads: 12500, calls: 45000, time: 95, teams: 250 });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const features = [
    {
      icon: Phone,
      title: "Smart Call Recording",
      description: "Record calls directly in-browser or upload external recordings with automatic transcription",
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: BarChart3,
      title: "AI-Powered Extraction",
      description: "Automatically extract answers from call transcripts to populate qualification forms",
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Manage sales reps, track performance, and configure scoring rules from the admin panel",
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    {
      icon: Zap,
      title: "Real-time Analytics",
      description: "Get instant insights and performance metrics to optimize your sales process",
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with end-to-end encryption and compliance certifications",
      color: "text-red-500",
      bgColor: "bg-red-50"
    },
    {
      icon: Target,
      title: "Lead Scoring",
      description: "Advanced AI algorithms to score leads and predict conversion probability",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "VP of Sales, TechCorp",
      content: "SalesQualify increased our lead qualification efficiency by 300%. The AI transcription is incredibly accurate.",
      avatar: "SJ",
      rating: 5
    },
    {
      name: "Mike Chen",
      role: "Sales Director, GrowthCo",
      content: "The automated form filling saves us hours every week. Our team can focus on selling instead of data entry.",
      avatar: "MC",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Sales, InnovateLab",
      content: "The analytics dashboard gives us insights we never had before. Game-changing for our sales process.",
      avatar: "ER",
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "per month",
      description: "Perfect for small sales teams",
      features: [
        "Up to 100 calls/month",
        "Basic AI transcription",
        "Standard lead scoring",
        "Email support",
        "Basic analytics"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$79",
      period: "per month",
      description: "Ideal for growing businesses",
      features: [
        "Up to 500 calls/month",
        "Advanced AI features",
        "Custom lead scoring",
        "Priority support",
        "Advanced analytics",
        "Team collaboration"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "per month",
      description: "For large organizations",
      features: [
        "Unlimited calls",
        "All AI features",
        "Custom integrations",
        "24/7 support",
        "Custom analytics",
        "API access",
        "Dedicated manager"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <Phone className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SalesQualify
            </span>
          </motion.div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">Pricing</a>
            <a href="#testimonials" className="text-gray-600 hover:text-primary transition-colors">Testimonials</a>
            <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
              Get Started Now
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section 
        className="pt-32 pb-20 px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="container mx-auto text-center">
          <motion.div variants={itemVariants} className="mb-6">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              🚀 Trusted by 250+ sales teams worldwide
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-6xl md:text-7xl font-bold mb-6"
            variants={itemVariants}
          >
            <span className="bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Qualify Leads
            </span>
            <br />
            <span className="text-gray-900">Like Never Before</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            variants={itemVariants}
          >
            Transform your sales process with AI-powered call recording, intelligent transcription, 
            and automated lead qualification. Save 10+ hours per week while improving accuracy.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            variants={itemVariants}
          >
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setIsVideoPlaying(true)}
              className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-gray-50 transition-all duration-300"
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            variants={itemVariants}
          >
            {[
              { label: "Leads Qualified", value: stats.leads.toLocaleString(), icon: Target },
              { label: "Calls Processed", value: stats.calls.toLocaleString(), icon: Phone },
              { label: "Time Saved %", value: `${stats.time}%`, icon: Clock },
              { label: "Happy Teams", value: stats.teams, icon: Users }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* App Screenshot Section */}
      <motion.section 
        className="py-20 px-4 bg-gradient-to-r from-primary/5 to-blue-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto text-center">
          <motion.h2 
            className="text-4xl font-bold mb-4 text-gray-900"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            See SalesQualify in Action
          </motion.h2>
          <motion.p 
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Experience the power of AI-driven lead qualification with our intuitive dashboard
          </motion.p>
          
          <motion.div 
            className="relative max-w-6xl mx-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 border">
              <div className="bg-gray-100 rounded-lg p-6 h-96 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-24 w-24 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Interactive Dashboard</h3>
                  <p className="text-gray-600">Real-time analytics and lead scoring in action</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        id="features"
        className="py-20 px-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto">
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              ✨ Features
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Everything You Need to Qualify Leads
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful AI-driven tools designed to streamline your sales process and boost conversion rates
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section 
        className="py-20 px-4 bg-gray-50"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto">
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              🔄 Process
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 4-step process
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { 
                step: 1, 
                title: 'Import Leads', 
                description: 'Connect Google Sheets, Airtable, or upload CSV files with your lead data',
                icon: FileText,
                color: 'bg-blue-500'
              },
              { 
                step: 2, 
                title: 'Record Calls', 
                description: 'Use our built-in recorder or upload existing call recordings for analysis',
                icon: Phone,
                color: 'bg-green-500'
              },
              { 
                step: 3, 
                title: 'AI Processing', 
                description: 'Our AI transcribes calls and extracts qualification answers automatically',
                icon: Zap,
                color: 'bg-purple-500'
              },
              { 
                step: 4, 
                title: 'Get Results', 
                description: 'Receive lead scores, insights, and recommended next actions instantly',
                icon: TrendingUp,
                color: 'bg-orange-500'
              },
            ].map((item, index) => (
              <motion.div 
                key={index} 
                className="text-center relative"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`w-16 h-16 ${item.color} text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 relative z-10`}>
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent transform translate-x-8" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.section 
        id="testimonials"
        className="py-20 px-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto">
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              💬 Testimonials
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Loved by Sales Teams Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our customers are saying about SalesQualify
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold mr-4">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-600">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Pricing */}
      <motion.section 
        id="pricing"
        className="py-20 px-4 bg-gray-50"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto">
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              💰 Pricing
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your team size and needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className={`relative ${plan.popular ? 'md:-mt-4' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <Card className={`h-full ${plan.popular ? 'border-primary shadow-xl' : 'border-0 shadow-lg'} hover:shadow-xl transition-all duration-300`}>
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600 ml-2">{plan.period}</span>
                    </div>
                    <p className="text-gray-600 mt-2">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : 'bg-gray-900 hover:bg-gray-800'}`}
                      onClick={() => navigate('/auth')}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 px-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto">
          <Card className="text-center bg-gradient-to-r from-primary to-blue-600 text-white border-0 shadow-2xl">
            <CardContent className="py-16">
              <motion.h2 
                className="text-4xl font-bold mb-4"
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                Ready to Transform Your Sales Process?
              </motion.h2>
              <motion.p 
                className="text-xl mb-8 opacity-90 max-w-2xl mx-auto"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 0.9 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Join 250+ sales teams already using SalesQualify to streamline their qualification process and boost conversions
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <Button 
                  size="lg" 
                  variant="secondary" 
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Get Started Now - It's Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className="bg-gray-900 text-white py-16 px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Phone className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">SalesQualify</span>
              </div>
              <p className="text-gray-400 mb-4">
                The AI-powered platform that transforms how sales teams qualify leads and close deals.
              </p>
              <div className="flex gap-4">
                <Twitter className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Github className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SalesQualify. All rights reserved.</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Index;
